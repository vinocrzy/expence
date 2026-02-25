/**
 * Debug Cache API Route (Development Only)
 *
 * GET /api/portfolio/debug-storage
 *
 * Inspect the in-memory NSE price cache — stats, sample quotes, and TTL info.
 * Returns 403 in production.
 */

import { NextResponse } from 'next/server';
import { getAllCachedQuotes, getCacheStats } from '@/lib/server/price-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    const stats = getCacheStats();
    const allQuotes = getAllCachedQuotes();
    const symbols = Object.keys(allQuotes);

    // Return first 20 quotes as a sample to keep the response small
    const sampleQuotes = Object.fromEntries(
      symbols.slice(0, 20).map((s) => [s, allQuotes[s]])
    );

    return NextResponse.json({
      cache: stats,
      lastRefreshedISO:
        stats.lastRefreshedAt > 0 ? new Date(stats.lastRefreshedAt).toISOString() : null,
      totalSymbols: symbols.length,
      sampleQuotes,
    });
  } catch (error) {
    console.error('Debug cache error:', error);
    return NextResponse.json(
      {
        error: 'Failed to read cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
