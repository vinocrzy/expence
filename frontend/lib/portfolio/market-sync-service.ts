/**
 * Frontend Market Sync Service
 * 
 * Orchestrates market price synchronization:
 * 1. Fetches cached market data from Next.js API
 * 2. Stores quotes and snapshots in PouchDB
 * 3. Handles offline mode and market holidays gracefully
 * 
 * Updated to use Next.js API routes instead of Netlify Functions
 */

import {
  getUniqueSymbols,
  upsertMarketQuotes,
  storeMarketSnapshot,
  hasTodayCloseSnapshot,
} from './repository';
import type {
  MarketSyncResponse,
  MarketSession,
  PortfolioError,
} from './types';

/**
 * Market sync configuration
 */
const MARKET_SYNC_CONFIG = {
  // Next.js API endpoints
  marketDataUrl: '/api/portfolio/market-data',
  marketSyncUrl: '/api/portfolio/market-sync',
  
  // Market timings (IST)
  marketOpenTime: { hour: 9, minute: 15 },
  marketCloseTime: { hour: 15, minute: 30 },
};

/**
 * Check if market is currently open (IST timezone)
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  
  const day = istTime.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const hour = istTime.getUTCHours();
  const minute = istTime.getUTCMinutes();
  
  // Check if weekday (Monday-Friday)
  if (day === 0 || day === 6) return false;
  
  // Check if within market hours (9:15 AM - 3:30 PM IST)
  const currentMinutes = hour * 60 + minute;
  const openMinutes = MARKET_SYNC_CONFIG.marketOpenTime.hour * 60 + 
                      MARKET_SYNC_CONFIG.marketOpenTime.minute;
  const closeMinutes = MARKET_SYNC_CONFIG.marketCloseTime.hour * 60 + 
                       MARKET_SYNC_CONFIG.marketCloseTime.minute;
  
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

/**
 * Determine current market session
 */
export function getCurrentMarketSession(): MarketSession | null {
  const now = new Date();
  
  // Convert to IST
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  const day = istTime.getUTCDay();
  const hour = istTime.getUTCHours();
  const minute = istTime.getUTCMinutes();
  
  // Not a weekday
  if (day === 0 || day === 6) return null;
  
  const currentMinutes = hour * 60 + minute;
  const openMinutes = MARKET_SYNC_CONFIG.marketOpenTime.hour * 60 + 
                      MARKET_SYNC_CONFIG.marketOpenTime.minute;
  const closeMinutes = MARKET_SYNC_CONFIG.marketCloseTime.hour * 60 + 
                       MARKET_SYNC_CONFIG.marketCloseTime.minute;
  
  // During market hours or shortly after open
  if (currentMinutes >= openMinutes && currentMinutes < openMinutes + 30) {
    return 'OPEN';
  }
  
  // At or after market close
  if (currentMinutes >= closeMinutes) {
    return 'CLOSE';
  }
  
  return null;
}

/**
 * Fetch latest market data from server cache
 * 
 * @param householdId - Optional household ID to filter symbols
 * @returns Market sync response with cached quotes
 */
export async function syncMarketPrices(
  householdId?: string
): Promise<MarketSyncResponse> {
  try {
    // 1. Get unique symbols from user holdings
    const symbols = await getUniqueSymbols(householdId);
    
    if (symbols.length === 0) {
      console.log('No symbols to sync');
      return {
        success: true,
        quotes: [],
        timestamp: new Date().toISOString(),
        errors: [],
      };
    }

    console.log(`Fetching cached data for ${symbols.length} symbols:`, symbols);

    // 2. Fetch latest cached prices from Next.js API
    const queryParams = new URLSearchParams({
      symbols: symbols.join(','),
    });

    const response = await fetch(
      `${MARKET_SYNC_CONFIG.marketDataUrl}?${queryParams}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: MarketSyncResponse = await response.json();

    if (!result.success) {
      console.error('Market data fetch failed:', result.errors);
      return result;
    }

    // 3. Store latest quotes in PouchDB
    if (result.quotes.length > 0) {
      await upsertMarketQuotes(result.quotes);
      console.log(`Upserted ${result.quotes.length} market quotes to PouchDB`);
    }

    return result;
  } catch (error) {
    console.error('Market sync error:', error);
    return {
      success: false,
      quotes: [],
      timestamp: new Date().toISOString(),
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Trigger server-side market sync (only use for manual triggers)
 * This POSTs to the server to fetch fresh data from RapidAPI
 * 
 * @param session - OPEN or CLOSE session
 * @returns Market sync response
 */
export async function triggerServerSync(
  session?: 'OPEN' | 'CLOSE'
): Promise<MarketSyncResponse> {
  try {
    console.log(`Triggering server-side market sync for ${session || 'AUTO'} session...`);

    const requestBody = session ? { session } : {};

    const response = await fetch(MARKET_SYNC_CONFIG.marketSyncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: MarketSyncResponse = await response.json();
    
    console.log('Server sync complete:', {
      success: result.success,
      quoteCount: result.quotes.length,
      session: result.session,
    });

    return result;
  } catch (error) {
    console.error('Server sync trigger failed:', error);
    return {
      success: false,
      quotes: [],
      timestamp: new Date().toISOString(),
      errors: [error instanceof Error ? error.message : 'Failed to trigger sync'],
    };
  }
}

/**
 * Auto-sync on app startup (pulls cached data)
 * This is lightweight and always safe to call
 */
export async function syncIfNeeded(householdId?: string): Promise<void> {
  try {
    // Check if prices are stale
    const stale = await arePricesStale();
    
    if (!stale) {
      console.log('Prices are fresh, skipping auto-sync');
      return;
    }

    console.log('Auto-syncing market prices from cache...');
    await syncMarketPrices(householdId);
  } catch (error) {
    console.error('Auto-sync failed:', error);
    // Don't throw - auto-sync is best-effort
  }
}

/**
 * Manual sync (triggered by user, pulls latest cache)
 */
export async function manualSync(householdId?: string): Promise<MarketSyncResponse> {
  console.log('Manual market data fetch triggered');
  return syncMarketPrices(householdId);
}

/**
 * Get last sync timestamp from latest quote
 */
export async function getLastSyncTime(): Promise<string | null> {
  try {
    const { getLatestQuotes } = await import('./repository');
    const quotes = await getLatestQuotes();
    const quoteArray = Object.values(quotes);
    
    if (quoteArray.length === 0) return null;
    
    // Find most recent update
    const lastUpdated = quoteArray.reduce((latest, quote) => {
      return quote.lastUpdated > latest ? quote.lastUpdated : latest;
    }, quoteArray[0].lastUpdated);
    
    return lastUpdated;
  } catch (error) {
    console.error('Failed to get last sync time:', error);
    return null;
  }
}

/**
 * Check if prices are stale (> 24 hours old)
 */
export async function arePricesStale(): Promise<boolean> {
  const lastSync = await getLastSyncTime();
  
  if (!lastSync) return true;
  
  const lastSyncTime = new Date(lastSync).getTime();
  const now = Date.now();
  const hoursSinceSync = (now - lastSyncTime) / (1000 * 60 * 60);
  
  return hoursSinceSync > 24;
}

/**
 * Market sync status
 */
export interface MarketSyncStatus {
  isMarketOpen: boolean;
  currentSession: MarketSession | null;
  lastSyncTime: string | null;
  isStale: boolean;
  canSync: boolean;
}

/**
 * Get current market sync status
 */
export async function getMarketSyncStatus(): Promise<MarketSyncStatus> {
  const marketOpen = isMarketOpen();
  const session = getCurrentMarketSession();
  const lastSync = await getLastSyncTime();
  const stale = await arePricesStale();
  
  return {
    isMarketOpen: marketOpen,
    currentSession: session,
    lastSyncTime: lastSync,
    isStale: stale,
    canSync: session !== null,
  };
}
