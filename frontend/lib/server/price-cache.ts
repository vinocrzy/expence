/**
 * In-Memory Price Cache
 *
 * Uses `globalThis` so the cache survives Next.js hot-reloads in development
 * and is shared across all requests within the same Node.js process in production.
 *
 * Market-aware refresh strategy:
 *  - Cache only refreshes when NSE market is OPEN (Mon–Fri 09:15–15:30 IST)
 *  - When market is CLOSED the cached data is served as-is — prices won't
 *    change until the next trading session opens
 *  - TTL is 1 hour (configurable via NSE_CACHE_TTL_MS)
 *  - Refresh fires automatically on each incoming GET /api/portfolio/prices when:
 *      market is open  AND  (cache is empty  OR  last refresh > TTL ago)
 *  - isRefreshing flag prevents concurrent thundering-herd refreshes
 */

import {
  fetchIndexConstituents,
  fetchEtfList,
  fetchSymbolQuote,
  type NseQuote,
} from './nse-client';

export type { NseQuote };

export interface CachedQuote extends NseQuote {
  cachedAt: number; // epoch ms
}

interface PriceCache {
  quotes: Map<string, CachedQuote>;
  lastRefreshedAt: number;   // epoch ms, 0 = never refreshed
  isRefreshing: boolean;
}

// ─── Singleton on globalThis ──────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __nseCache: PriceCache | undefined;
}

function getCache(): PriceCache {
  if (!globalThis.__nseCache) {
    globalThis.__nseCache = {
      quotes: new Map(),
      lastRefreshedAt: 0,
      isRefreshing: false,
    };
  }
  return globalThis.__nseCache;
}

// ─── TTL ──────────────────────────────────────────────────────────────────────

function getTtlMs(): number {
  const env = process.env.NSE_CACHE_TTL_MS || '3600000'; // default 1 hour
  const parsed = env ? parseInt(env, 10) : NaN;
  return isNaN(parsed) ? 60 * 60 * 1_000 : parsed; // default 1 hour
}

// ─── Market hours (IST = UTC+5:30) ───────────────────────────────────────────

/**
 * Returns true while NSE is in a live trading session:
 *   Monday–Friday, 09:15–15:30 IST
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1_000; // UTC+5:30
  const ist = new Date(now.getTime() + istOffset);

  const day = ist.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return minutes >= (9 * 60 + 15) && minutes < (15 * 60 + 30);
}

/**
 * Cache is stale only when market is open AND data is older than TTL.
 * When market is closed, data is always considered fresh.
 */
export function isCacheStale(): boolean {
  const cache = getCache();
  if (cache.lastRefreshedAt === 0) return true;    // never loaded
  if (!isMarketOpen()) return false;               // market closed → no refresh needed
  return Date.now() - cache.lastRefreshedAt > getTtlMs();
}

/**
 * Returns true when this request should trigger a cache refresh.
 * Gates on: market open + not already refreshing + TTL exceeded.
 */
export function shouldRefreshNow(): boolean {
  const cache = getCache();
  if (cache.isRefreshing) return false;
  if (!isMarketOpen()) return false;
  if (cache.lastRefreshedAt === 0) return true;
  return Date.now() - cache.lastRefreshedAt > getTtlMs();
}

// ─── Refresh helpers ──────────────────────────────────────────────────────────

/**
 * Merge an array of NseQuote objects into the cache map.
 * Newer entries overwrite older ones for the same symbol.
 */
function mergeQuotes(cache: PriceCache, quotes: NseQuote[]): void {
  const now = Date.now();
  for (const q of quotes) {
    const existing = cache.quotes.get(q.symbol);
    if (!existing || q.price > 0) {
      cache.quotes.set(q.symbol, { ...q, cachedAt: now });
    }
  }
}

/**
 * Full refresh: fetch NIFTY 50, NIFTY 500, and ETF list in parallel.
 * Merges all results; NIFTY 500 supersedes NIFTY 50 for the same symbol.
 * ETFs are stored with type='ETF'.
 *
 * Returns the number of symbols now in the cache.
 */
export async function refreshAll(): Promise<number> {
  const cache = getCache();

  if (cache.isRefreshing) {
    console.log('[PriceCache] refreshAll: already in progress, skipping');
    return cache.quotes.size;
  }

  cache.isRefreshing = true;
  console.log('[PriceCache] refreshAll: starting…');

  try {
    // Fetch the three sources in parallel
    const [nifty50, nifty500, etfs] = await Promise.allSettled([
      fetchIndexConstituents('NIFTY 50'),
      fetchIndexConstituents('NIFTY 500'),
      fetchEtfList(),
    ]);

    if (nifty50.status === 'fulfilled') mergeQuotes(cache, nifty50.value);
    else console.warn('[PriceCache] NIFTY 50 fetch failed:', nifty50.reason);

    if (nifty500.status === 'fulfilled') mergeQuotes(cache, nifty500.value);
    else console.warn('[PriceCache] NIFTY 500 fetch failed:', nifty500.reason);

    if (etfs.status === 'fulfilled') mergeQuotes(cache, etfs.value);
    else console.warn('[PriceCache] ETF list fetch failed:', etfs.reason);

    cache.lastRefreshedAt = Date.now();
    console.log(`[PriceCache] refreshAll: done, ${cache.quotes.size} symbols cached`);
    return cache.quotes.size;
  } finally {
    cache.isRefreshing = false;
  }
}

/**
 * Fetch individual quotes for symbols not in the cache (or with stale individual entries).
 * Runs up to MAX_CONCURRENT parallel requests to avoid flooding NSE.
 */
export async function refreshMissing(symbols: string[]): Promise<void> {
  const cache = getCache();
  const MAX_CONCURRENT = 5;

  const missing = symbols.filter((s) => !cache.quotes.has(s.toUpperCase()));
  if (missing.length === 0) return;

  console.log(`[PriceCache] refreshMissing: fetching ${missing.length} symbols`);

  // Batch into groups of MAX_CONCURRENT
  for (let i = 0; i < missing.length; i += MAX_CONCURRENT) {
    const batch = missing.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.allSettled(batch.map(fetchSymbolQuote));
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        mergeQuotes(cache, [result.value]);
      }
    }
  }
}

// ─── Public read API ──────────────────────────────────────────────────────────

/**
 * Get cached quotes for the requested symbols.
 * Returns:
 *   hits   – symbols that were found in the cache
 *   misses – symbols that were NOT in the cache
 */
export function getPrices(symbols: string[]): {
  hits: Record<string, CachedQuote>;
  misses: string[];
} {
  const cache = getCache();
  const hits: Record<string, CachedQuote> = {};
  const misses: string[] = [];

  for (const sym of symbols) {
    const upper = sym.toUpperCase();
    const cached = cache.quotes.get(upper);
    if (cached) {
      hits[upper] = cached;
    } else {
      misses.push(upper);
    }
  }

  return { hits, misses };
}

/**
 * Return ALL cached quotes as a plain object keyed by symbol.
 */
export function getAllCachedQuotes(): Record<string, CachedQuote> {
  const cache = getCache();
  return Object.fromEntries(cache.quotes.entries());
}

/**
 * Return cache metadata.
 */
export function getCacheStats(): {
  count: number;
  lastRefreshedAt: number;
  isStale: boolean;
  isRefreshing: boolean;
  isMarketOpen: boolean;
  ttlMs: number;
} {
  const cache = getCache();
  return {
    count: cache.quotes.size,
    lastRefreshedAt: cache.lastRefreshedAt,
    isStale: isCacheStale(),
    isRefreshing: cache.isRefreshing,
    isMarketOpen: isMarketOpen(),
    ttlMs: getTtlMs(),
  };
}

/**
 * Warm the cache on first use — only when the market is open.
 * Outside market hours, skip silently: the previous session's data is correct.
 * Does NOT await — fires in the background.
 */
export function warmCacheIfNeeded(): void {
  const cache = getCache();
  if (cache.quotes.size > 0 || cache.isRefreshing) return;

  if (isMarketOpen()) {
    refreshAll().catch((err) => console.error('[PriceCache] Warm failed:', err));
  } else {
    console.log('[PriceCache] Cold start outside market hours — skipping warm refresh');
  }
}
