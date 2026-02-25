/**
 * Market Data API Route
 *
 * GET /api/portfolio/market-data
 *
 * Backwards-compatible endpoint: returns the in-memory NSE price cache in the
 * same shape the existing market-sync-service client expects.
 *
 * Prefer GET /api/portfolio/prices for new code.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllCachedQuotes,
  getCacheStats,
  warmCacheIfNeeded,
} from '@/lib/server/price-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    warmCacheIfNeeded();

    const stats = getCacheStats();
    const cachedQuotes = getAllCachedQuotes();
    const symbols = Object.keys(cachedQuotes);

    if (symbols.length === 0) {
      return NextResponse.json(
        {
          error: 'No market data available',
          message:
            'NSE price cache is empty. A background refresh has been started — retry in ~30 s.',
        },
        { status: 404 }
      );
    }

    // Shape the cached quotes into the QuoteUpdate[] array the old client expected
    const quotes = symbols.map((sym) => {
      const q = cachedQuotes[sym];
      return {
        symbol: q.symbol,
        exchange: q.exchange,
        price: q.price,
        timestamp: q.lastUpdated,
        change: q.change,
        changePercent: q.changePercent,
      };
    });

    const ageMs = stats.lastRefreshedAt > 0 ? Date.now() - stats.lastRefreshedAt : Infinity;
    const ageHours = ageMs / (1000 * 60 * 60);
    const ageMinutes = ageMs / (1000 * 60);

    console.log(`📊 market-data: Served ${quotes.length} quotes (age: ${Math.round(ageHours * 10) / 10}h)`);

    return NextResponse.json(
      {
        quotes,
        fetchedAt:
          stats.lastRefreshedAt > 0
            ? new Date(stats.lastRefreshedAt).toISOString()
            : null,
        session: 'LIVE',
        isStale: stats.isStale,
        ageHours: Math.round(ageHours * 10) / 10,
        ageMinutes: Math.round(ageMinutes),
      },
      {
        headers: { 'Cache-Control': 'public, max-age=300' },
      }
    );
  } catch (error) {
    console.error('❌ Error fetching market data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch market data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
