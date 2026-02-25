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
  const configuredEndpoint = process.env.RAPIDAPI_ENDPOINT;

  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY environment variable not set');
  }

  const querySymbols = symbols.join(',');
  const endpointAttempts: Array<{
    method: 'GET' | 'POST';
    path: string;
    body?: unknown;
  }> = configuredEndpoint
    ? [
        {
          method: 'POST',
          path: configuredEndpoint,
          body: { symbols, exchange: 'NSE' },
        },
      ]
    : [
        {
          method: 'POST',
          path: '/stock_prices',
          body: { symbols, exchange: 'NSE' },
        },
        {
          method: 'GET',
          path: `/price?Indices=${encodeURIComponent(querySymbols)}`,
        },
      ];

  const errors: string[] = [];

  for (const attempt of endpointAttempts) {
    const url = `https://${apiHost}${attempt.path}`;

    try {
      const response = await fetch(url, {
        method: attempt.method,
        headers: {
          ...(attempt.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': apiHost,
        },
        body: attempt.body ? JSON.stringify(attempt.body) : undefined,
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errorText = `RapidAPI ${attempt.method} ${attempt.path} failed: ${response.status} ${response.statusText}`;
        errors.push(errorText);
        continue;
      }

      const data = await response.json();
      const quotes = parseRapidApiResponse(data, symbols);

      if (quotes.length > 0) {
        return quotes;
      }

      errors.push(`RapidAPI ${attempt.method} ${attempt.path} returned no quote rows`);
    } catch (error) {
      errors.push(
        `RapidAPI ${attempt.method} ${attempt.path} request error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  throw new Error(`RapidAPI fetch failed (${apiHost}). Attempts: ${errors.join(' | ')}`);
}

function parseRapidApiResponse(data: unknown, requestedSymbols: string[]) {
  const rows = extractRows(data);

  return rows
    .map((row) => normalizeQuoteRow(row, requestedSymbols))
    .filter((quote): quote is {
      symbol: string;
      exchange: string;
      price: number;
      timestamp: string;
      change?: number;
      changePercent?: number;
    } => Boolean(quote));
}

function extractRows(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  const payload = data as Record<string, unknown>;

  if (Array.isArray(payload.stocks)) {
    return payload.stocks;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [payload];
}

function normalizeQuoteRow(row: unknown, requestedSymbols: string[]) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const item = row as Record<string, unknown>;

  const symbolValue = item.symbol ?? item.Symbol ?? item.ticker ?? item.Ticker ?? item.companySymbol;
  const symbol = typeof symbolValue === 'string' && symbolValue.trim().length > 0
    ? symbolValue.trim()
    : requestedSymbols[0];

  const priceValue = item.lastPrice ?? item.price ?? item.ltp ?? item.last ?? item.close;
  const price = Number(priceValue);

  if (!Number.isFinite(price)) {
    return null;
  }

  const exchangeValue = item.exchange ?? item.Exchange ?? 'NSE';
  const exchange = typeof exchangeValue === 'string' && exchangeValue.trim().length > 0
    ? exchangeValue.trim()
    : 'NSE';

  const changeNumber = Number(item.change ?? item.Change);
  const changePercentNumber = Number(item.changePercent ?? item.pChange ?? item.percentChange ?? item.ChangePercent);

  return {
    symbol,
    exchange,
    price,
    timestamp: new Date().toISOString(),
    ...(Number.isFinite(changeNumber) ? { change: changeNumber } : {}),
    ...(Number.isFinite(changePercentNumber) ? { changePercent: changePercentNumber } : {}),
  };
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
