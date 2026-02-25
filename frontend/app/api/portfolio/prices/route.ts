/**
 * Prices API Route
 *
 * GET  /api/portfolio/prices
 *   Returns current cache snapshot — symbol list, last refresh time, staleness.
 *   Used by StockTransactionModal for autocomplete and by the portfolio page header.
 *
 * POST /api/portfolio/prices
 *   Body (optional): { symbols?: string[] }
 *   - With symbols: refresh only those symbols (cache-miss fill)
 *   - Without symbols: full refresh (NIFTY 50 + NIFTY 500 + ETF list)
 *   Returns updated snapshot.
 *
 * This route replaces the old market-sync / stock-api trigger path.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllCachedQuotes,
  getCacheStats,
  refreshAll,
  refreshMissing,
  shouldRefreshNow,
  isMarketOpen,
} from '@/lib/server/price-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  try {
    const marketOpen = isMarketOpen();

    if (shouldRefreshNow()) {
      // Market is open + cache is stale/empty — refresh inline so this
      // response already carries live prices.
      console.log('[/api/portfolio/prices] Market open + stale — refreshing…');
      await refreshAll();
    } else if (!marketOpen) {
      console.log('[/api/portfolio/prices] Market closed — serving cached data');
    }

    const stats = getCacheStats();
    const quotes = getAllCachedQuotes();

    return NextResponse.json(
      {
        quotes,
        count: stats.count,
        lastRefreshedAt: stats.lastRefreshedAt,
        lastRefreshedISO:
          stats.lastRefreshedAt > 0
            ? new Date(stats.lastRefreshedAt).toISOString()
            : null,
        isStale: stats.isStale,
        isMarketOpen: marketOpen,
        isRefreshing: stats.isRefreshing,
        ttlMs: stats.ttlMs,
      },
      {
        headers: {
          // During market hours: no CDN caching (prices change every minute)
          // Outside market hours: CDN can cache for 1 hour — prices are frozen
          'Cache-Control': marketOpen
            ? 'no-store'
            : 'public, max-age=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('[/api/portfolio/prices GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to read price cache', details: String(error) },
      { status: 500 }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

interface PricesRefreshRequest {
  symbols?: string[];
}

export async function POST(request: NextRequest) {
  try {
    let body: PricesRefreshRequest = {};
    try {
      body = await request.json();
    } catch {
      // body is optional
    }

    if (body.symbols && body.symbols.length > 0) {
      console.log(`[/api/portfolio/prices] Refreshing ${body.symbols.length} symbols`);
      await refreshMissing(body.symbols);
    } else {
      console.log('[/api/portfolio/prices] Full refresh triggered');
      await refreshAll();
    }

    const stats = getCacheStats();
    const quotes = getAllCachedQuotes();

    return NextResponse.json({
      success: true,
      quotes,
      count: stats.count,
      lastRefreshedAt: stats.lastRefreshedAt,
      lastRefreshedISO:
        stats.lastRefreshedAt > 0
          ? new Date(stats.lastRefreshedAt).toISOString()
          : null,
      isStale: stats.isStale,
    });
  } catch (error) {
    console.error('[/api/portfolio/prices POST] error:', error);
    return NextResponse.json(
      { success: false, error: 'Refresh failed', details: String(error) },
      { status: 500 }
    );
  }
}
