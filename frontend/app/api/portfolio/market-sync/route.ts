/**
 * Market Sync API Route
 *
 * POST /api/portfolio/market-sync
 *
 * Fetches market data from the internal yfinance stock-api service and caches it.
 * Can be triggered by:
 * - Scheduled functions (Netlify/Vercel)
 * - GitHub Actions
 * - Manual testing
 *
 * Requires STOCK_API_URL env var (defaults to http://stock-api:8000 in Docker).
 * Set USE_MOCK_DATA=true to use generated mock data without the service running.
 */

import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/server/storage';
import { generateMockMarketData, shouldUseMock, delay, getDefaultSymbols } from '@/lib/server/mock-market-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SyncRequest {
  session?: 'OPEN' | 'CLOSE';
  symbols?: string[];
}

/**
 * POST handler - Sync market data
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Market sync triggered');

    // Parse request body (optional for scheduled triggers)
    let body: SyncRequest = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional - will use defaults
    }

    // Get symbols to fetch
    const symbols = body.symbols || getDefaultSymbols();

    // Determine session based on IST time if not provided
    const session = body.session || determineSession();

    console.log(`📊 Fetching ${symbols.length} symbols for ${session} session`);

    let quotes: Array<{ 
      symbol: string; 
      exchange: string; 
      price: number; 
      timestamp: string;
      change?: number;
      changePercent?: number;
    }>;

    // Use mock data in development or if API key is missing
    if (shouldUseMock()) {
      console.log('🧪 Using MOCK market data (development mode)');
      await delay(300); // Simulate API delay
      
      const mockData = generateMockMarketData(symbols);
      quotes = mockData.map(stock => ({
        symbol: stock.symbol,
        exchange: stock.exchange,
        price: stock.lastPrice,
        timestamp: new Date().toISOString(),
        change: stock.change,
        changePercent: stock.changePercent,
      }));
    } else {
      console.log('🌐 Fetching REAL market data from yfinance stock-api service');
      quotes = await fetchFromYFinanceService(symbols);
    }

    // Create snapshot
    const snapshot = {
      quotes,
      fetchedAt: new Date().toISOString(),
      session,
    };

    // Save to storage
    await storage.saveLatest(snapshot);
    
    // Also save dated snapshot
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    await storage.saveSnapshot(today, session, snapshot);

    console.log(`✅ Stored ${quotes.length} ${session} quotes`);

    return NextResponse.json({
      success: true,
      count: quotes.length,
      session,
      timestamp: new Date().toISOString(),
      mock: shouldUseMock(),
    });

  } catch (error) {
    console.error('❌ Market sync failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch real market data from the internal yfinance stock-api service.
 *
 * The service accepts NSE and BSE symbols separately, so we split by exchange,
 * make up to two calls, and merge the results.
 */
async function fetchFromYFinanceService(symbols: string[]) {
  const baseUrl = process.env.STOCK_API_URL || 'http://stock-api:8000';

  // Determine exchange per-symbol from env or default to NSE.
  // Format: ACTIVE_SYMBOLS=RELIANCE:NSE,HDFCBANK:BSE or plain RELIANCE,TCS
  const nsePairs: string[] = [];
  const bsePairs: string[] = [];

  for (const raw of symbols) {
    const [sym, exch = 'NSE'] = raw.split(':');
    if (exch.toUpperCase() === 'BSE') {
      bsePairs.push(sym.toUpperCase());
    } else {
      nsePairs.push(sym.toUpperCase());
    }
  }

  const results: Array<{
    symbol: string;
    exchange: string;
    price: number;
    timestamp: string;
    change?: number;
    changePercent?: number;
  }> = [];

  const fetchBatch = async (batchSymbols: string[], exchange: 'NSE' | 'BSE') => {
    if (batchSymbols.length === 0) return;

    const response = await fetch(`${baseUrl}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: batchSymbols, exchange }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(
        `stock-api responded ${response.status} ${response.statusText} for ${exchange} batch`
      );
    }

    const data = await response.json() as {
      quotes: Array<{
        symbol: string;
        exchange: string;
        price: number;
        change?: number;
        changePercent?: number;
        timestamp: string;
      }>;
      cachedCount: number;
      fetchedCount: number;
    };

    console.log(
      `📈 stock-api ${exchange}: ${data.fetchedCount} fetched, ${data.cachedCount} from cache`
    );

    for (const q of data.quotes) {
      if (q.price > 0) {
        results.push({
          symbol: q.symbol,
          exchange: q.exchange,
          price: q.price,
          timestamp: q.timestamp,
          ...(q.change != null ? { change: q.change } : {}),
          ...(q.changePercent != null ? { changePercent: q.changePercent } : {}),
        });
      }
    }
  };

  await Promise.all([
    fetchBatch(nsePairs, 'NSE'),
    fetchBatch(bsePairs, 'BSE'),
  ]);

  if (results.length === 0) {
    throw new Error('stock-api returned no valid quotes for the requested symbols');
  }

  return results;
}

/**
 * Determine market session based on current IST time
 * 
 * Market hours (IST):
 * - OPEN: 9:15 AM - 12:00 PM
 * - CLOSE: After 3:30 PM
 */
function determineSession(): 'OPEN' | 'CLOSE' {
  const now = new Date();
  
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  const hour = istTime.getUTCHours();
  const minute = istTime.getUTCMinutes();
  const currentMinutes = hour * 60 + minute;
  
  // Market opens at 9:15 AM IST
  const openTime = 9 * 60 + 15;
  
  // Market closes at 3:30 PM IST
  const closeTime = 15 * 60 + 30;
  
  // If between 9:15 AM and 12:00 PM, consider it OPEN session
  // Otherwise, CLOSE session
  if (currentMinutes >= openTime && currentMinutes < (12 * 60)) {
    return 'OPEN';
  }
  
  return 'CLOSE';
}
