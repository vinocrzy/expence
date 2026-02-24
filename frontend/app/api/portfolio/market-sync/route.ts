/**
 * Market Sync API Route
 * 
 * POST /api/portfolio/market-sync
 * 
 * Fetches market data from RapidAPI and caches it
 * Can be triggered by:
 * - Scheduled functions (Netlify/Vercel)
 * - GitHub Actions
 * - Manual testing
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
      console.log('🌐 Fetching REAL market data from RapidAPI');
      quotes = await fetchFromRapidAPI(symbols);
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
 * Fetch real market data from RapidAPI
 */
async function fetchFromRapidAPI(symbols: string[]) {
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'indian-stock-exchange-api2.p.rapidapi.com';

  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY environment variable not set');
  }

  try {
    const response = await fetch(
      `https://${apiHost}/stock_prices`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': apiHost,
        },
        body: JSON.stringify({
          symbols,
          exchange: 'NSE'
        }),
        signal: AbortSignal.timeout(15000), // 15 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform API response to our format
    // Note: Adjust based on actual RapidAPI response structure
    return data.stocks.map((stock: any) => ({
      symbol: stock.symbol,
      exchange: 'NSE',
      price: stock.lastPrice || stock.price,
      timestamp: new Date().toISOString(),
      change: stock.change,
      changePercent: stock.changePercent || stock.pChange,
    }));

  } catch (error) {
    console.error('RapidAPI fetch error:', error);
    throw error;
  }
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
