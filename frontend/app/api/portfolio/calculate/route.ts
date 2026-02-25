/**
 * Portfolio Calculate API Route
 *
 * POST /api/portfolio/calculate
 *
 * Accepts a list of pre-aggregated holdings from the client (from PouchDB),
 * enriches them with live NSE prices from the in-memory cache,
 * and returns computed P&L, portfolio summary, and analytics — all server-side.
 *
 * Request body:
 * {
 *   holdings: SimpleHolding[]   // aggregated from local transactions
 * }
 *
 * Response:
 * {
 *   holdings: Holding[]
 *   summary: PortfolioSummary
 *   analytics: PortfolioAnalytics
 *   pricesLastUpdated: string | null
 *   isStale: boolean
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPrices,
  refreshMissing,
  getCacheStats,
  warmCacheIfNeeded,
  type CachedQuote,
} from '@/lib/server/price-cache';
import {
  calculatePortfolioAnalyticsSimple,
} from '@/lib/portfolio/portfolio-analytics';
import type {
  Holding,
  PortfolioSummary,
  Exchange,
  MarketQuote,
} from '@/lib/portfolio/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Request shape ─────────────────────────────────────────────────────────────

/**
 * Simplified holding — the client aggregates raw transactions into this before
 * sending. Keeps the payload small (no full transaction history).
 */
export interface SimpleHolding {
  symbol: string;
  exchange: Exchange;
  totalUnits: number;
  avgBuyPrice: number;
  investedValue: number;
  firstBuyDate: string;
  lastTransactionDate: string;
}

interface CalculateRequest {
  holdings: SimpleHolding[];
}

// ─── Helper: build Holding from SimpleHolding + live price ────────────────────

function enrichHolding(simple: SimpleHolding, quote: CachedQuote | undefined): Holding {
  const currentPrice = quote && quote.price > 0 ? quote.price : simple.avgBuyPrice;
  const currentValue = currentPrice * simple.totalUnits;
  const unrealisedPnL = currentValue - simple.investedValue;
  const unrealisedPnLPercent =
    simple.investedValue > 0 ? (unrealisedPnL / simple.investedValue) * 100 : 0;

  return {
    symbol: simple.symbol.toUpperCase(),
    exchange: simple.exchange,
    totalUnits: simple.totalUnits,
    avgBuyPrice: simple.avgBuyPrice,
    investedValue: round2(simple.investedValue),
    currentPrice: round2(currentPrice),
    currentValue: round2(currentValue),
    unrealisedPnL: round2(unrealisedPnL),
    unrealisedPnLPercent: round2(unrealisedPnLPercent),
    firstBuyDate: simple.firstBuyDate,
    lastTransactionDate: simple.lastTransactionDate,
  };
}

function buildSummary(holdings: Holding[]): PortfolioSummary {
  if (holdings.length === 0) {
    return {
      totalInvestment: 0,
      totalCurrentValue: 0,
      totalUnrealisedPnL: 0,
      totalUnrealisedPnLPercent: 0,
      totalHoldings: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  const totalInvestment = holdings.reduce((s, h) => s + h.investedValue, 0);
  const totalCurrentValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalUnrealisedPnL = totalCurrentValue - totalInvestment;
  const totalUnrealisedPnLPercent =
    totalInvestment > 0 ? (totalUnrealisedPnL / totalInvestment) * 100 : 0;

  return {
    totalInvestment: round2(totalInvestment),
    totalCurrentValue: round2(totalCurrentValue),
    totalUnrealisedPnL: round2(totalUnrealisedPnL),
    totalUnrealisedPnLPercent: round2(totalUnrealisedPnLPercent),
    totalHoldings: holdings.length,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Build a MarketQuote record keyed by `{exchange}_{symbol}` from NSE cache quotes.
 * Used to build today's "current" price map for analytics.
 */
function buildQuoteRecord(
  quotes: Record<string, CachedQuote>
): Record<string, MarketQuote> {
  const result: Record<string, MarketQuote> = {};
  for (const [symbol, q] of Object.entries(quotes)) {
    const key = `${q.exchange}_${symbol}`;
    result[key] = {
      _id: `quote_${q.exchange}_${symbol}`,
      symbol: q.symbol,
      exchange: q.exchange,
      price: q.price,
      timestamp: q.lastUpdated,
      change: q.change,
      changePercent: q.changePercent,
      lastUpdated: q.lastUpdated,
    };
  }
  return result;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    let body: CalculateRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body. Expected { holdings: SimpleHolding[] }' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body?.holdings)) {
      return NextResponse.json(
        { error: 'Body must contain a "holdings" array' },
        { status: 400 }
      );
    }

    if (body.holdings.length === 0) {
      // Empty portfolio — return zero state immediately
      const summary = buildSummary([]);
      const analytics = calculatePortfolioAnalyticsSimple([], summary);
      return NextResponse.json({
        holdings: [],
        summary,
        analytics,
        pricesLastUpdated: null,
        isStale: true,
      });
    }

    // Warmup cache lazily
    warmCacheIfNeeded();

    // Extract unique symbols
    const symbols = [...new Set(body.holdings.map((h) => h.symbol.toUpperCase()))];

    // Get cached prices; fetch missing ones individually
    let { hits, misses } = getPrices(symbols);

    if (misses.length > 0) {
      await refreshMissing(misses);
      // Re-query after filling misses
      const refetched = getPrices(symbols);
      hits = { ...hits, ...refetched.hits };
    }

    // Enrich holdings with live prices
    const enrichedHoldings: Holding[] = body.holdings.map((simple) =>
      enrichHolding(simple, hits[simple.symbol.toUpperCase()])
    );

    // Build portfolio summary
    const summary = buildSummary(enrichedHoldings);

    // Build analytics (simple mode — no OPEN snapshot data on the server;
    // today P&L is approximated using previousClose from NSE quotes)
    const analytics = calculatePortfolioAnalyticsSimple(enrichedHoldings, summary);

    const stats = getCacheStats();

    // Also return the used quotes so the client can update PouchDB if desired
    const usedQuotes = buildQuoteRecord(hits);

    return NextResponse.json({
      holdings: enrichedHoldings,
      summary,
      analytics,
      quotes: usedQuotes,
      pricesLastUpdated:
        stats.lastRefreshedAt > 0
          ? new Date(stats.lastRefreshedAt).toISOString()
          : null,
      isStale: stats.isStale,
    });
  } catch (error) {
    console.error('[/api/portfolio/calculate] error:', error);
    return NextResponse.json(
      { error: 'Calculation failed', details: String(error) },
      { status: 500 }
    );
  }
}
