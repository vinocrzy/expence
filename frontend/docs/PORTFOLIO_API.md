# Portfolio API Reference

Server-side portfolio and market data API. All routes live under `/api/portfolio/`.  
Data is sourced from the **NSE India API** and stored in an in-memory cache keyed on `globalThis.__nseCache`.

---

## Table of Contents

- [GET /api/portfolio/prices](#get-apiportfolioprices)
- [POST /api/portfolio/prices](#post-apiportfolioprices)
- [POST /api/portfolio/calculate](#post-apiportfoliocalculate)
- [GET /api/portfolio/market-data](#get-apiportfoliomarket-data)
- [POST /api/portfolio/market-sync](#post-apiportfoliomarket-sync)
- [GET /api/portfolio/debug-storage](#get-apiportfoliodebug-storage)
- [Shared Types](#shared-types)
- [Cache Behaviour](#cache-behaviour)
- [Authentication](#authentication)

---

## GET /api/portfolio/prices

Returns the current in-memory price cache snapshot.  
If the market is **open** and the cache is stale, a live refresh is performed inline before responding.

### Response

```jsonc
{
  "quotes": {
    "RELIANCE": {
      "symbol": "RELIANCE",
      "name": "Reliance Industries Ltd.",
      "price": 1234.55,
      "open": 1230.00,
      "previousClose": 1220.10,
      "change": 14.45,
      "changePercent": 1.18,
      "dayHigh": 1240.00,
      "dayLow": 1228.00,
      "volume": 3500000,
      "lastUpdated": "2026-02-25T09:45:00.000Z",
      "type": "STOCK",   // "STOCK" | "ETF"
      "exchange": "NSE"
    }
    // …more symbols
  },
  "count": 560,
  "lastRefreshedAt": 1740480300000,      // epoch ms; 0 if never refreshed
  "lastRefreshedISO": "2026-02-25T09:45:00.000Z",  // null if never refreshed
  "isStale": false,
  "isMarketOpen": true,
  "isRefreshing": false,
  "ttlMs": 3600000
}
```

### Cache-Control

| Market state | Header |
|---|---|
| Open | `no-store` (CDN must not cache — prices change every minute) |
| Closed | `public, max-age=3600, stale-while-revalidate=86400` |

### Errors

| Status | Meaning |
|---|---|
| `500` | NSE fetch failed or cache read error |

---

## POST /api/portfolio/prices

Trigger a manual cache refresh.

- **With `symbols`** — refreshes only the listed symbols (fills cache misses).
- **Without `symbols`** — full refresh: NIFTY 50 + NIFTY 500 + full ETF list.

### Request Body

```jsonc
{
  "symbols": ["NIFTYBEES", "GOLDBEES"]   // optional; omit for full refresh
}
```

### Response

Same shape as [GET /api/portfolio/prices](#get-apiportfolioprices).

### Errors

| Status | Meaning |
|---|---|
| `500` | NSE fetch failed |

---

## POST /api/portfolio/calculate

**Primary portfolio valuation endpoint.**  
Accepts a pre-aggregated list of holdings (built from local PouchDB transactions), enriches each holding with the latest NSE price from the in-memory cache, and returns server-computed P&L, summary, and analytics.

Cache misses (symbols not yet cached) are fetched individually from NSE before the calculation runs.

### Request Body

```jsonc
{
  "holdings": [
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "totalUnits": 10,
      "avgBuyPrice": 1150.00,
      "investedValue": 11500.00,
      "firstBuyDate": "2024-01-15",
      "lastTransactionDate": "2025-06-30"
    }
  ]
}
```

#### `SimpleHolding` fields

| Field | Type | Description |
|---|---|---|
| `symbol` | `string` | NSE ticker symbol (case-insensitive; normalised to uppercase) |
| `exchange` | `"NSE"` | Exchange — always `NSE` for now |
| `totalUnits` | `number` | Net units held (buys minus sells) |
| `avgBuyPrice` | `number` | Volume-weighted average buy price |
| `investedValue` | `number` | Total cost basis (INR) |
| `firstBuyDate` | `string` | ISO 8601 date of the earliest buy |
| `lastTransactionDate` | `string` | ISO 8601 date of the most recent transaction |

### Response

```jsonc
{
  "holdings": [
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "totalUnits": 10,
      "avgBuyPrice": 1150.00,
      "investedValue": 11500.00,
      "currentPrice": 1234.55,
      "currentValue": 12345.50,
      "unrealisedPnL": 845.50,
      "unrealisedPnLPercent": 7.35,
      "firstBuyDate": "2024-01-15",
      "lastTransactionDate": "2025-06-30"
    }
  ],
  "summary": {
    "totalInvestment": 11500.00,
    "totalCurrentValue": 12345.50,
    "totalUnrealisedPnL": 845.50,
    "totalUnrealisedPnLPercent": 7.35,
    "totalHoldings": 1,
    "lastUpdated": "2026-02-25T09:45:00.000Z"
  },
  "analytics": { /* PortfolioAnalytics — sector breakdown, XIRR, etc. */ },
  "quotes": {
    "NSE_RELIANCE": {
      "_id": "quote_NSE_RELIANCE",
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "price": 1234.55,
      "timestamp": "2026-02-25T09:45:00.000Z",
      "change": 14.45,
      "changePercent": 1.18,
      "lastUpdated": "2026-02-25T09:45:00.000Z"
    }
  },
  "pricesLastUpdated": "2026-02-25T09:45:00.000Z",  // null if cache empty
  "isStale": false
}
```

> **Fallback**: If a symbol has no cached price (and NSE returns nothing), `currentPrice` falls back to `avgBuyPrice` so holdings are still returned (just with 0 unrealised P&L).

### Errors

| Status | Meaning |
|---|---|
| `400` | Body missing, not JSON, or `holdings` not an array |
| `500` | Calculation or NSE fetch failed |

---

## GET /api/portfolio/market-data

**Legacy / backwards-compatible endpoint.**  
Returns the in-memory cache in the shape the old `market-sync-service` client expects.  
Prefer [GET /api/portfolio/prices](#get-apiportfolioprices) for new code.

If the cache is empty, triggers a background warm-up and returns `404` asking the caller to retry in ~30 s.

### Response

```jsonc
{
  "quotes": [
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "price": 1234.55,
      "timestamp": "2026-02-25T09:45:00.000Z",
      "change": 14.45,
      "changePercent": 1.18
    }
  ],
  "fetchedAt": "2026-02-25T09:45:00.000Z",  // null if never refreshed
  "session": "LIVE",
  "isStale": false,
  "ageHours": 0.1,
  "ageMinutes": 6
}
```

### Headers

`Cache-Control: public, max-age=300`

### Errors

| Status | Meaning |
|---|---|
| `404` | Cache is empty — warm-up triggered, retry in ~30 s |
| `500` | Failed to read cache |

---

## POST /api/portfolio/market-sync

**Legacy / backwards-compatible endpoint.**  
Triggers a full NSE price cache refresh. Kept for compatibility with the Netlify scheduled function (`netlify/functions/trigger-market-sync.ts`).  
Prefer [POST /api/portfolio/prices](#post-apiportfolioprices) for new callers.

### Request Body

None required.

### Response

```jsonc
{
  "success": true,
  "count": 560,
  "lastRefreshedAt": 1740480300000,
  "lastRefreshedISO": "2026-02-25T09:45:00.000Z",
  "timestamp": "2026-02-25T09:47:00.000Z"
}
```

### Errors

| Status | Meaning |
|---|---|
| `500` | NSE refresh failed |

---

## GET /api/portfolio/debug-storage

**Development only** — returns `403` in production.  
Inspect the in-memory NSE price cache: stats, TTL info, and a sample of up to 20 cached quotes.

### Response

```jsonc
{
  "cache": {
    "count": 560,
    "lastRefreshedAt": 1740480300000,
    "isStale": false,
    "isRefreshing": false,
    "isMarketOpen": true,
    "ttlMs": 3600000
  },
  "lastRefreshedISO": "2026-02-25T09:45:00.000Z",
  "totalSymbols": 560,
  "sampleQuotes": {
    "RELIANCE": { /* NseQuote */ }
    // …up to 20 entries
  }
}
```

### Errors

| Status | Meaning |
|---|---|
| `403` | Requested in `NODE_ENV=production` |
| `500` | Failed to read cache |

---

## Shared Types

### `NseQuote`

```typescript
interface NseQuote {
  symbol: string;
  name: string;
  price: number;
  open: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  lastUpdated: string;   // ISO 8601
  type: 'STOCK' | 'ETF';
  exchange: 'NSE';
}
```

### `CacheStats`

```typescript
interface CacheStats {
  count: number;
  lastRefreshedAt: number;  // epoch ms; 0 = never refreshed
  isStale: boolean;
  isRefreshing: boolean;
  isMarketOpen: boolean;
  ttlMs: number;
}
```

---

## Cache Behaviour

| Scenario | Behaviour |
|---|---|
| Market open + cache empty | Synchronous refresh on first `GET /api/portfolio/prices` (slow first hit) |
| Market open + cache stale (> TTL) | Synchronous refresh on next `GET /api/portfolio/prices` |
| Market open + cache fresh | Serves cached data immediately |
| Market **closed** | Serves cached data as-is; `isCacheStale()` always returns `false` |
| Concurrent refresh requests | `isRefreshing` flag gates all threads — only one refresh runs at a time |

**TTL**: 1 hour default, configurable via `NSE_CACHE_TTL_MS` environment variable.

**Market hours**: Monday–Friday, **09:15–15:30 IST** (UTC+5:30).  
Weekends and outside those hours → no refresh triggered.

**Symbol coverage** (full refresh):
- All NIFTY 50 constituents (`/api/equity-stockIndices?index=NIFTY%2050`)
- All NIFTY 500 constituents (`/api/equity-stockIndices?index=NIFTY%20500`)
- Full NSE ETF list (`/api/etf`) — ~300+ ETFs

---

## Authentication

| Route | Auth required |
|---|---|
| `GET /api/portfolio/prices` | No (public) |
| `POST /api/portfolio/prices` | No (public — used by Netlify trigger) |
| `GET /api/portfolio/market-data` | No (public) |
| `POST /api/portfolio/market-sync` | No (public — used by Netlify trigger) |
| `POST /api/portfolio/calculate` | **Yes** (Clerk session required) |
| `GET /api/portfolio/debug-storage` | No auth, but dev-only (`NODE_ENV !== production`) |

Public routes are listed in `frontend/middleware.ts` under the `publicRoutes` array.
