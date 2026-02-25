/**
 * Market Sync API Route
 *
 * POST /api/portfolio/market-sync
 *
 * Thin wrapper kept for backwards-compat with the Netlify scheduled trigger
 * and any existing callers. Delegates to the new NSE in-memory price cache.
 *
 * For direct usage prefer POST /api/portfolio/prices.
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshAll, getCacheStats } from '@/lib/server/price-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST handler - delegates to the NSE price cache refreshAll().
 */
export async function POST(_request: NextRequest) {
  try {
    console.log('🔄 market-sync: delegating to NSE price cache…');
    await refreshAll();

    const stats = getCacheStats();

    return NextResponse.json({
      success: true,
      count: stats.count,
      lastRefreshedAt: stats.lastRefreshedAt,
      lastRefreshedISO: new Date(stats.lastRefreshedAt).toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ market-sync failed:', error);
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
