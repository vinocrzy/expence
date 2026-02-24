/**
 * Debug Storage API Route (Development Only)
 * 
 * GET /api/portfolio/debug-storage
 * 
 * View all stored market data snapshots
 * Only available in development mode
 */

import { NextResponse } from 'next/server';
import { storage } from '@/lib/server/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET handler - Debug storage contents
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    const latest = await storage.getLatest();
    const snapshotFiles = await storage.listSnapshots();
    const allSnapshots = await storage.getAllSnapshots();

    return NextResponse.json({
      storageLocation: '.data/market/',
      latest,
      snapshotCount: snapshotFiles.length,
      snapshotFiles,
      snapshots: allSnapshots,
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Debug storage error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to read storage',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
