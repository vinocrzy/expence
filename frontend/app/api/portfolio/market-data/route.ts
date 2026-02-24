/**
 * Market Data API Route
 * 
 * GET /api/portfolio/market-data
 * 
 * Returns cached market quotes for frontend consumption
 * Frontend stores this in PouchDB and calculates holdings
 */

import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/server/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET handler - Fetch latest cached market data
 */
export async function GET(request: NextRequest) {
  try {
    const latestData = await storage.getLatest();

    if (!latestData) {
      return NextResponse.json(
        { 
          error: 'No market data available',
          message: 'Market data not yet synced. Please trigger a sync or wait for scheduled sync.',
        },
        { status: 404 }
      );
    }

    // Calculate data age
    const fetchedAt = new Date(latestData.fetchedAt);
    const ageMs = Date.now() - fetchedAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    const ageMinutes = ageMs / (1000 * 60);
    
    // Data is considered stale if older than 24 hours
    const isStale = ageHours > 24;

    // Prepare response
    const response = {
      ...latestData,
      isStale,
      ageHours: Math.round(ageHours * 10) / 10,
      ageMinutes: Math.round(ageMinutes),
    };

    console.log(`📊 Served ${latestData.quotes.length} quotes (age: ${response.ageHours}h, session: ${latestData.session})`);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      }
    });

  } catch (error) {
    console.error('❌ Error fetching market data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch market data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
