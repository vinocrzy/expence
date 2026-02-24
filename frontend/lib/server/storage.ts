/**
 * Server-Side Market Data Storage
 * 
 * Simple file-based storage for market data that works on any platform
 * (Vercel, Netlify, local development, etc.)
 */

import fs from 'fs/promises';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.data', 'market');

export interface MarketSnapshot {
  quotes: Array<{ 
    symbol: string; 
    exchange: string; 
    price: number; 
    timestamp: string;
    change?: number;
    changePercent?: number;
  }>;
  fetchedAt: string;
  session: 'OPEN' | 'CLOSE';
}

/**
 * Simple file-based storage for market data
 * Works on any platform (Vercel, Netlify, local)
 */
export class MarketDataStorage {
  /**
   * Ensure storage directory exists
   */
  private async ensureDir() {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }

  /**
   * Save latest market snapshot (always overwritten)
   */
  async saveLatest(snapshot: MarketSnapshot): Promise<void> {
    await this.ensureDir();
    const filePath = path.join(STORAGE_DIR, 'latest.json');
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    console.log(`💾 Saved latest snapshot to ${filePath}`);
  }

  /**
   * Save dated snapshot (for historical tracking)
   */
  async saveSnapshot(date: string, session: 'OPEN' | 'CLOSE', snapshot: MarketSnapshot): Promise<void> {
    await this.ensureDir();
    const fileName = `snapshot_${date}_${session}.json`;
    const filePath = path.join(STORAGE_DIR, fileName);
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    console.log(`💾 Saved ${session} snapshot for ${date}`);
  }

  /**
   * Get latest market snapshot
   */
  async getLatest(): Promise<MarketSnapshot | null> {
    try {
      const filePath = path.join(STORAGE_DIR, 'latest.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get specific snapshot by date and session
   */
  async getSnapshot(date: string, session: 'OPEN' | 'CLOSE'): Promise<MarketSnapshot | null> {
    try {
      const fileName = `snapshot_${date}_${session}.json`;
      const filePath = path.join(STORAGE_DIR, fileName);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all snapshot files
   */
  async listSnapshots(): Promise<string[]> {
    try {
      await this.ensureDir();
      const files = await fs.readdir(STORAGE_DIR);
      return files.filter(f => f.startsWith('snapshot_') && f.endsWith('.json'));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all snapshots with their data (for debugging)
   */
  async getAllSnapshots(): Promise<Record<string, MarketSnapshot>> {
    const snapshots: Record<string, MarketSnapshot> = {};
    const files = await this.listSnapshots();
    
    for (const file of files) {
      try {
        const filePath = path.join(STORAGE_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        snapshots[file] = JSON.parse(content);
      } catch (error) {
        console.error(`Failed to read ${file}:`, error);
      }
    }
    
    return snapshots;
  }

  /**
   * Delete old snapshots (keep last N days)
   */
  async cleanupOldSnapshots(keepDays: number = 30): Promise<number> {
    const files = await this.listSnapshots();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);
    
    let deletedCount = 0;
    
    for (const file of files) {
      // Extract date from filename: snapshot_2026-02-24_OPEN.json
      const match = file.match(/snapshot_(\d{4}-\d{2}-\d{2})_/);
      if (match) {
        const fileDate = new Date(match[1]);
        if (fileDate < cutoffDate) {
          try {
            const filePath = path.join(STORAGE_DIR, file);
            await fs.unlink(filePath);
            deletedCount++;
            console.log(`🗑️ Deleted old snapshot: ${file}`);
          } catch (error) {
            console.error(`Failed to delete ${file}:`, error);
          }
        }
      }
    }
    
    return deletedCount;
  }
}

// Singleton instance
export const storage = new MarketDataStorage();
