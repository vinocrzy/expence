# Stock Quote API — v2.0.0

Self-hosted Indian stock market data API powered by Yahoo Finance. No API keys or paid subscriptions required. Supports NSE and BSE equities, ETFs, and major indices.

**Base URL (Docker):** `http://stock-api:8000`  
**Base URL (local dev):** `http://localhost:4600`  
**Interactive docs:** `http://localhost:4600/docs` (Swagger UI)  
**OpenAPI schema:** `http://localhost:4600/openapi.json`

---

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Rate Limits](#rate-limits)
- [Caching](#caching)
- [Endpoints](#endpoints)
  - [POST /quotes](#post-quotes)
  - [GET /search](#get-search)
  - [GET /top](#get-top)
  - [GET /indices](#get-indices)
  - [GET /history/{symbol}](#get-historysymbol)
  - [GET /fundamentals/{symbol}](#get-fundamentalssymbol)
  - [GET /market-status](#get-market-status)
  - [GET /metrics](#get-metrics)
  - [GET /health](#get-health)
- [Error Responses](#error-responses)
- [Valid Range / Interval Combinations](#valid-range--interval-combinations)
- [Supported Indices](#supported-indices)
- [NIFTY 50 Universe](#nifty-50-universe)
- [Architecture Notes](#architecture-notes)

---

## Quick Start

```bash
# Start the service
docker compose up -d

# Fetch a live quote
curl -X POST http://localhost:4600/quotes \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["RELIANCE", "TCS", "INFY"], "exchange": "NSE"}'

# Search for a stock
curl "http://localhost:4600/search?q=reliance&exchange=NSE&limit=5"

# Check market hours
curl http://localhost:4600/market-status
```

---

## Configuration

All settings are configurable via environment variables or a `.env` file.

| Variable | Default | Description |
|---|---|---|
| `CACHE_TTL_SECONDS` | `300` | Quote cache TTL in seconds |
| `HISTORY_INTRADAY_TTL` | `300` | Cache TTL for 1d/5d range history |
| `HISTORY_DAILY_TTL` | `1800` | Cache TTL for 1mo–6mo range history |
| `HISTORY_LONG_TTL` | `86400` | Cache TTL for 1y+ range history |
| `SEARCH_CACHE_TTL` | `60` | Search results cache TTL |
| `FUNDAMENTALS_CACHE_TTL` | `3600` | Fundamentals cache TTL |
| `TOP_MOVERS_CACHE_TTL` | `300` | Top movers cache TTL |
| `MAX_BATCH_SIZE` | `50` | Maximum symbols per `/quotes` request |
| `ALLOWED_ORIGINS` | `*` | CORS origins (comma-separated) |
| `RATE_QUOTES` | `30/minute` | Rate limit for `/quotes` |
| `RATE_SEARCH` | `20/minute` | Rate limit for `/search` |
| `RATE_HISTORY` | `10/minute` | Rate limit for `/history` |
| `RATE_FUNDAMENTALS` | `10/minute` | Rate limit for `/fundamentals` |
| `RATE_TOP` | `5/minute` | Rate limit for `/top` |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG/INFO/WARNING/ERROR) |
| `STOCK_API_PORT` | `8000` | Host port (docker-compose only) |

---

## Rate Limits

Rate limits are enforced per IP address using a token-bucket algorithm. Exceeding a limit returns HTTP `429 Too Many Requests`.

| Endpoint | Default Limit |
|---|---|
| `POST /quotes` | 30 req/min |
| `GET /search` | 20 req/min |
| `GET /history/{symbol}` | 10 req/min |
| `GET /fundamentals/{symbol}` | 10 req/min |
| `GET /top` | 5 req/min |
| `GET /indices` | Unlimited |
| `GET /market-status` | Unlimited |
| `GET /metrics` | Unlimited |
| `GET /health` | Unlimited |

All limits are configurable — see [Configuration](#configuration).

---

## Caching

Five independent TTL caches are used. Cache keys include all relevant parameters so different queries are never conflated.

| Cache | Max Entries | Default TTL | Key Pattern |
|---|---|---|---|
| Quote cache | 500 | 5 min | `NSE:RELIANCE` |
| History cache | 500 | 5 min (intraday) / 30 min (daily) / 24 hr (long) | `hist:NSE:RELIANCE:1mo:1d` |
| Search cache | 200 | 1 min | `search:RELIANCE:all:NSE:10` |
| Fundamentals cache | 200 | 60 min | `fund:NSE:TCS` |
| Top movers cache | 20 | 5 min | `top:NSE:10` |

Cache statistics (hit ratio, sizes, TTLs) are available via [`GET /metrics`](#get-metrics).

---

## Endpoints

### POST /quotes

Fetch live prices for a batch of NSE or BSE symbols. Results are served from cache when available; uncached symbols are fetched concurrently from Yahoo Finance.

**Rate limit:** 30 req/min

#### Request Body

```json
{
  "symbols": ["RELIANCE", "TCS", "HDFCBANK"],
  "exchange": "NSE"
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `symbols` | `string[]` | Yes | — | List of stock symbols (max 50). Case-insensitive. |
| `exchange` | `"NSE"` \| `"BSE"` | No | `"NSE"` | Which exchange to resolve symbols on |

#### Response `200 OK`

```json
{
  "quotes": [
    {
      "symbol": "RELIANCE",
      "exchange": "NSE",
      "price": 1428.90,
      "change": 8.40,
      "changePercent": 0.59,
      "timestamp": "2026-02-25T06:44:26.308554+00:00"
    },
    {
      "symbol": "TCS",
      "exchange": "NSE",
      "price": 3512.45,
      "change": -22.10,
      "changePercent": -0.63,
      "timestamp": "2026-02-25T06:44:26.308554+00:00"
    }
  ],
  "cachedCount": 1,
  "fetchedCount": 2,
  "timestamp": "2026-02-25T06:44:26.400000+00:00"
}
```

| Field | Type | Description |
|---|---|---|
| `quotes[].symbol` | `string` | Symbol as submitted |
| `quotes[].exchange` | `string` | Exchange |
| `quotes[].price` | `float` | Last traded price in INR |
| `quotes[].change` | `float \| null` | Absolute change vs previous close |
| `quotes[].changePercent` | `float \| null` | Percentage change vs previous close |
| `quotes[].timestamp` | `string` | ISO 8601 UTC timestamp of the fetch |
| `cachedCount` | `int` | Number of symbols served from cache |
| `fetchedCount` | `int` | Number of symbols fetched live |

> **Note:** If a symbol cannot be fetched (network error, delisted, etc.) it is returned with `price: 0.0` rather than causing the entire request to fail.

#### Errors

| Code | Reason |
|---|---|
| `400` | Empty symbols list, invalid symbol format, or batch size > `MAX_BATCH_SIZE` |
| `429` | Rate limit exceeded |

---

### GET /search

Search for stocks, ETFs, and indices by name or symbol ticker via Yahoo Finance's fuzzy search.

**Rate limit:** 20 req/min | **Cache TTL:** 1 min

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `q` | `string` | Yes | — | Search query. Accepts symbol (`RELIANCE`) or company name (`Tata Consultancy`). Length 1–50. |
| `type` | `"stock"` \| `"etf"` \| `"index"` \| `"all"` | No | `"all"` | Filter by instrument type |
| `exchange` | `"NSE"` \| `"BSE"` \| `"all"` | No | `"all"` | Filter results to a specific exchange |
| `limit` | `integer` | No | `10` | Number of results to return (1–25) |

#### Example Requests

```bash
# Search across NSE and BSE
curl "http://localhost:4600/search?q=tata&limit=5"

# NSE stocks only
curl "http://localhost:4600/search?q=reliance&exchange=NSE&type=stock"

# ETFs containing "nifty" in their name
curl "http://localhost:4600/search?q=nifty&type=etf&limit=10"
```

#### Response `200 OK`

```json
{
  "results": [
    {
      "symbol": "RELIANCE.NS",
      "name": "Reliance Industries Limited",
      "exchange": "NSE",
      "type": "stock",
      "score": 20031.0
    },
    {
      "symbol": "RCOM.NS",
      "name": "Reliance Communications Limited",
      "exchange": "NSE",
      "type": "stock",
      "score": 20006.0
    }
  ],
  "count": 2,
  "query": "reliance",
  "timestamp": "2026-02-25T06:44:15.455111+00:00"
}
```

| Field | Type | Description |
|---|---|---|
| `results[].symbol` | `string` | Yahoo Finance ticker (e.g. `RELIANCE.NS`) |
| `results[].name` | `string` | Full company/fund name |
| `results[].exchange` | `string` | Exchange short code |
| `results[].type` | `string` | `stock`, `etf`, or `index` |
| `results[].score` | `float \| null` | Yahoo Finance relevance score (higher = more relevant) |
| `count` | `int` | Total results returned |

> **Tip:** Use the returned `symbol` (e.g. `RELIANCE.NS`) directly in chart tools. Strip the `.NS`/`.BO` suffix to pass to `/quotes`, `/history`, or `/fundamentals`.

#### Errors

| Code | Reason |
|---|---|
| `400` | `q` is missing or too short/long |
| `429` | Rate limit exceeded |

---

### GET /top

Top gainers, losers, and most-active stocks for the current trading session.

- **NSE/BSE:** Fetches live quotes for the full NIFTY 50 universe concurrently and ranks by `changePercent` / `volume`.
- **`all`:** Uses Yahoo Finance US market screeners (`day_gainers`, `day_losers`, `most_actives`).

**Rate limit:** 5 req/min | **Cache TTL:** 5 min

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `exchange` | `"NSE"` \| `"BSE"` \| `"all"` | No | `"NSE"` | Which market to scan |
| `count` | `integer` | No | `10` | Number of stocks per category (5–25) |

#### Example Requests

```bash
# Top 10 NSE movers
curl "http://localhost:4600/top"

# Top 5 BSE movers
curl "http://localhost:4600/top?exchange=BSE&count=5"
```

#### Response `200 OK`

```json
{
  "gainers": [
    {
      "symbol": "HEROMOTOCO",
      "name": "HEROMOTOCO",
      "price": 5793.00,
      "change": 378.50,
      "changePercent": 6.99,
      "volume": null,
      "marketCap": null
    }
  ],
  "losers": [
    {
      "symbol": "TECHM",
      "name": "TECHM",
      "price": 1371.90,
      "change": -107.40,
      "changePercent": -7.26,
      "volume": null,
      "marketCap": null
    }
  ],
  "mostActive": [
    {
      "symbol": "HEROMOTOCO",
      "name": "HEROMOTOCO",
      "price": 5793.00,
      "change": 378.50,
      "changePercent": 6.99,
      "volume": null,
      "marketCap": null
    }
  ],
  "exchange": "NSE",
  "timestamp": "2026-02-25T06:50:30.809357+00:00"
}
```

| Field | Type | Description |
|---|---|---|
| `gainers` | `Mover[]` | Top performers sorted by `changePercent` descending |
| `losers` | `Mover[]` | Worst performers sorted by `changePercent` ascending |
| `mostActive` | `Mover[]` | NSE/BSE: sorted by `changePercent`; `all`: sorted by volume |
| `exchange` | `string` | Exchange filter used |

> **Note:** `volume` and `marketCap` are `null` for NSE/BSE results because the Yahoo Finance chart API used for batch quotes does not return these fields. They are populated when `exchange=all` (US screener data).

#### Errors

| Code | Reason |
|---|---|
| `422` | `count` out of range (must be 5–25) |
| `429` | Rate limit exceeded |

---

### GET /indices

Live prices for 8 major Indian indices, fetched concurrently in a single request.

**Rate limit:** Unlimited | **Cache TTL:** 5 min (shared quote cache)

#### Example Request

```bash
curl http://localhost:4600/indices
```

#### Response `200 OK`

```json
{
  "indices": [
    {
      "ticker": "^NSEI",
      "name": "NIFTY 50",
      "price": 25593.20,
      "change": 138.85,
      "changePercent": 0.55,
      "timestamp": "2026-02-25T06:44:26.308554+00:00"
    },
    {
      "ticker": "^BSESN",
      "name": "SENSEX",
      "price": 82675.37,
      "change": 177.23,
      "changePercent": 0.21,
      "timestamp": "2026-02-25T06:44:26.669551+00:00"
    }
  ],
  "timestamp": "2026-02-25T06:44:26.669648+00:00"
}
```

See [Supported Indices](#supported-indices) for the full list of tickers.

---

### GET /history/{symbol}

OHLCV (Open, High, Low, Close, Volume) historical bars for a single symbol.

**Rate limit:** 10 req/min | **Cache TTL:** 5 min (intraday) / 30 min (daily) / 24 hr (1y+)

#### Path Parameters

| Parameter | Description |
|---|---|
| `symbol` | NSE/BSE symbol. e.g. `RELIANCE`, `HDFCBANK`. Validated against `^[A-Z0-9&\-.]{1,30}$`. |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `exchange` | `"NSE"` \| `"BSE"` | No | `"NSE"` | Exchange |
| `range` | `string` | No | `"1mo"` | Time range of data. See [Valid Range / Interval Combinations](#valid-range--interval-combinations). |
| `interval` | `string` | No | `"1d"` | Bar granularity. Must be compatible with `range`. |

#### Example Requests

```bash
# Daily bars for the past month
curl "http://localhost:4600/history/RELIANCE"

# 5-minute intraday bars for today
curl "http://localhost:4600/history/RELIANCE?range=1d&interval=5m"

# Weekly bars for 1 year
curl "http://localhost:4600/history/TCS?range=1y&interval=1wk"

# BSE symbol, 3-month daily
curl "http://localhost:4600/history/RELIANCE?exchange=BSE&range=3mo&interval=1d"
```

#### Response `200 OK`

```json
{
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "range": "5d",
  "interval": "1d",
  "bars": [
    {
      "timestamp": "2026-02-19T03:45:00+00:00",
      "open": 1443.00,
      "high": 1443.00,
      "low": 1400.00,
      "close": 1409.50,
      "volume": 11884664
    },
    {
      "timestamp": "2026-02-25T06:45:38+00:00",
      "open": 1435.00,
      "high": 1440.50,
      "low": 1427.30,
      "close": 1428.90,
      "volume": 2773077
    }
  ],
  "currency": "INR",
  "timezone": "Asia/Kolkata",
  "timestamp": "2026-02-25T06:45:42.100000+00:00"
}
```

> **Note:** `open`, `high`, `low`, `close`, `volume` can be `null` for bars at the edge of trading sessions or holiday gaps.

#### Errors

| Code | Reason |
|---|---|
| `400` | Invalid symbol format |
| `400` | Invalid `range` value |
| `400` | Invalid `interval` value |
| `400` | `interval` incompatible with `range` (e.g. `1m` with `1mo`) |
| `404` | Symbol not found on Yahoo Finance |
| `429` | Rate limit exceeded |

---

### GET /fundamentals/{symbol}

Key fundamental data for a stock — extracted from Yahoo Finance chart metadata. Includes 52-week range, name, PE ratio, beta, and more where available.

**Rate limit:** 10 req/min | **Cache TTL:** 60 min

#### Path Parameters

| Parameter | Description |
|---|---|
| `symbol` | NSE/BSE symbol. e.g. `TCS`, `KOTAKBANK` |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `exchange` | `"NSE"` \| `"BSE"` | No | `"NSE"` | Exchange |

#### Example Requests

```bash
# NSE stock fundamentals
curl "http://localhost:4600/fundamentals/TCS"

# BSE
curl "http://localhost:4600/fundamentals/RELIANCE?exchange=BSE"
```

#### Response `200 OK`

```json
{
  "symbol": "TCS",
  "exchange": "NSE",
  "name": "Tata Consultancy Services Limited",
  "sector": null,
  "industry": null,
  "description": null,
  "marketCap": null,
  "pe": null,
  "forwardPE": null,
  "eps": null,
  "dividendYield": null,
  "week52High": 3763.20,
  "week52Low": 2585.00,
  "avgVolume": 2043528,
  "beta": null,
  "debtToEquity": null,
  "returnOnEquity": null,
  "currentRatio": null,
  "grossMargin": null,
  "operatingMargin": null,
  "timestamp": "2026-02-25T06:48:37.919741+00:00"
}
```

| Field | Type | Description |
|---|---|---|
| `name` | `string \| null` | Full company name |
| `sector` | `string \| null` | Sector (e.g. `Technology`) |
| `industry` | `string \| null` | Industry sub-category |
| `description` | `string \| null` | Business description |
| `marketCap` | `float \| null` | Market capitalisation in INR |
| `pe` | `float \| null` | Trailing 12-month P/E ratio |
| `forwardPE` | `float \| null` | Forward P/E ratio |
| `eps` | `float \| null` | Earnings per share (trailing) |
| `dividendYield` | `float \| null` | Annual dividend yield (0.03 = 3%) |
| `week52High` | `float \| null` | 52-week high price |
| `week52Low` | `float \| null` | 52-week low price |
| `avgVolume` | `int \| null` | 10-day average daily volume |
| `beta` | `float \| null` | Beta vs benchmark |
| `debtToEquity` | `float \| null` | D/E ratio |
| `returnOnEquity` | `float \| null` | ROE as decimal (0.22 = 22%) |
| `currentRatio` | `float \| null` | Current assets / current liabilities |
| `grossMargin` | `float \| null` | Gross margin as decimal |
| `operatingMargin` | `float \| null` | Operating margin as decimal |

> **Note:** Yahoo Finance's public `v8/chart` API exposes a subset of financial data. Fields with richer sources (sector, PE, EPS) may return `null` for certain symbols depending on what Yahoo Finance includes in the chart meta response for that ticker.

#### Errors

| Code | Reason |
|---|---|
| `400` | Invalid symbol format |
| `404` | Symbol not found on Yahoo Finance |
| `429` | Rate limit exceeded |

---

### GET /market-status

Returns the current trading session status for NSE and BSE based on IST clock time. This is a **pure computation** — no external API call is made, so it is always fast and never fails.

**Rate limit:** Unlimited | **No cache** (stateless computation)

#### Trading Hours (IST)

| Session | Time (IST) | Days |
|---|---|---|
| Pre-market | 09:00 – 09:15 | Mon – Fri |
| Market open | 09:15 – 15:30 | Mon – Fri |
| Post-market | 15:30 – 16:00 | Mon – Fri |
| Closed | All other times | — |

> **Note:** Public holidays are not yet accounted for. The status is derived purely from weekday and time.

#### Example Request

```bash
curl http://localhost:4600/market-status
```

#### Response `200 OK` — Market Open

```json
{
  "nse": {
    "status": "open",
    "nextOpen": null,
    "nextClose": "2026-02-25T15:30:00+05:30"
  },
  "bse": {
    "status": "open",
    "nextOpen": null,
    "nextClose": "2026-02-25T15:30:00+05:30"
  },
  "currentIST": "2026-02-25T12:13:59+0530",
  "timestamp": "2026-02-25T06:43:59.100083+00:00"
}
```

#### Response `200 OK` — Market Closed

```json
{
  "nse": {
    "status": "closed",
    "nextOpen": "2026-02-26T09:15:00+05:30",
    "nextClose": null
  },
  "bse": {
    "status": "closed",
    "nextOpen": "2026-02-26T09:15:00+05:30",
    "nextClose": null
  },
  "currentIST": "2026-02-25T18:30:00+0530",
  "timestamp": "2026-02-25T13:00:00.000000+00:00"
}
```

| Field | Type | Description |
|---|---|---|
| `nse.status` / `bse.status` | `string` | `"open"`, `"closed"`, `"pre-market"`, or `"post-market"` |
| `nse.nextOpen` | `ISO string \| null` | When the market will next open (null if currently open) |
| `nse.nextClose` | `ISO string \| null` | When market will next close (null if currently closed) |
| `currentIST` | `string` | Server's current IST time |

---

### GET /metrics

Live operational statistics: cache sizes and hit ratios, per-endpoint request counters, and server uptime. Useful for monitoring and tuning cache TTLs.

**Rate limit:** Unlimited

#### Example Request

```bash
curl http://localhost:4600/metrics
```

#### Response `200 OK`

```json
{
  "quoteCacheSize": 51,
  "quoteCacheTTL": 300,
  "quoteCacheMaxSize": 500,
  "searchCacheSize": 3,
  "fundamentalsCacheSize": 2,
  "historyCacheSize": 4,
  "topMoversCacheSize": 1,
  "cacheHits": 142,
  "cacheMisses": 57,
  "cacheHitRatio": 0.7136,
  "requestsByEndpoint": {
    "quotes": 12,
    "search": 5,
    "top": 3,
    "history": 8,
    "fundamentals": 4,
    "indices": 6
  },
  "uptime": 3612.45,
  "timestamp": "2026-02-25T07:00:00.000000+00:00"
}
```

| Field | Type | Description |
|---|---|---|
| `quoteCacheSize` | `int` | Number of symbols currently in quote cache |
| `quoteCacheTTL` | `int` | Configured TTL in seconds |
| `quoteCacheMaxSize` | `int` | Maximum quote cache capacity (500) |
| `cacheHits` | `int` | Total cache hits since startup |
| `cacheMisses` | `int` | Total cache misses since startup |
| `cacheHitRatio` | `float` | Hit ratio 0.0 – 1.0 (4 decimal places) |
| `requestsByEndpoint` | `object` | Per-endpoint request counts since startup |
| `uptime` | `float` | Server uptime in seconds |

---

### GET /health

Liveness probe used by Docker's `HEALTHCHECK` instruction. Returns immediately with no external calls.

#### Example Request

```bash
curl http://localhost:4600/health
```

#### Response `200 OK`

```json
{
  "status": "ok",
  "version": "2.0.0",
  "cacheSize": 51,
  "cacheTTL": 300,
  "timestamp": "2026-02-25T06:43:38.965335+00:00"
}
```

---

## Error Responses

All error responses follow this shape:

```json
{
  "detail": "Invalid symbol: 'INVALID@SYMBOL'"
}
```

| HTTP Code | Meaning |
|---|---|
| `400 Bad Request` | Validation failed (invalid symbol, bad range/interval, empty list) |
| `404 Not Found` | Symbol not found on Yahoo Finance |
| `422 Unprocessable Entity` | FastAPI/Pydantic input validation failure (wrong type, missing required field) |
| `429 Too Many Requests` | Rate limit exceeded — back off and retry |
| `500 Internal Server Error` | Unexpected upstream error (Yahoo Finance unavailable, network timeout) |

---

## Valid Range / Interval Combinations

Yahoo Finance enforces strict rules on which intervals are valid for a given range. The API validates this and returns `400` on invalid combinations.

| Range | Allowed Intervals | Cache TTL |
|---|---|---|
| `1d` | `1m`, `5m`, `15m`, `30m`, `1h`, `1d` | 5 min |
| `5d` | `5m`, `15m`, `30m`, `1h`, `1d` | 5 min |
| `1mo` | `1h`, `1d` | 30 min |
| `3mo` | `1d` | 30 min |
| `6mo` | `1d`, `1wk` | 30 min |
| `1y` | `1d`, `1wk`, `1mo` | 24 hr |
| `2y` | `1d`, `1wk`, `1mo` | 24 hr |
| `5y` | `1wk`, `1mo` | 24 hr |
| `ytd` | `1d`, `1wk`, `1mo` | 24 hr |
| `max` | `1wk`, `1mo` | 24 hr |

---

## Supported Indices

`GET /indices` always returns all 8 indices:

| Yahoo Ticker | Name |
|---|---|
| `^NSEI` | NIFTY 50 |
| `^BSESN` | SENSEX |
| `^NSEBANK` | NIFTY BANK |
| `^CNXIT` | NIFTY IT |
| `^NSEMDCP50` | NIFTY MIDCAP 50 |
| `^CNXAUTO` | NIFTY AUTO |
| `^CNXPHARMA` | NIFTY PHARMA |
| `^CNXFMCG` | NIFTY FMCG |

---

## NIFTY 50 Universe

`GET /top?exchange=NSE` and `GET /top?exchange=BSE` derive rankings by batch-fetching the following 51 symbols:

`ADANIENT`, `ADANIPORTS`, `APOLLOHOSP`, `ASIANPAINT`, `AXISBANK`, `BAJAJ-AUTO`, `BAJFINANCE`, `BAJAJFINSV`, `BEL`, `BHARTIARTL`, `BPCL`, `BRITANNIA`, `CIPLA`, `COALINDIA`, `DRREDDY`, `EICHERMOT`, `GRASIM`, `HCLTECH`, `HDFCBANK`, `HDFCLIFE`, `HEROMOTOCO`, `HINDALCO`, `HINDUNILVR`, `ICICIBANK`, `INDUSINDBK`, `INFY`, `ITC`, `JIOFIN`, `JSWSTEEL`, `KOTAKBANK`, `LT`, `M&M`, `MARUTI`, `NESTLEIND`, `NTPC`, `ONGC`, `POWERGRID`, `RELIANCE`, `SBILIFE`, `SHRIRAMFIN`, `SBIN`, `SUNPHARMA`, `TATACONSUM`, `TATAMOTORS`, `TATASTEEL`, `TCS`, `TECHM`, `TITAN`, `TRENT`, `ULTRACEMCO`, `WIPRO`

---

## Architecture Notes

### Data Source

All market data is sourced from the Yahoo Finance v8 chart API (`query2.finance.yahoo.com/v8/finance/chart`). Browser-spoofed headers (User-Agent, Referer) are included on every request to ensure Yahoo Finance returns real data.

The more privileged v10 quoteSummary and v7 quote endpoints are **not** used; they require cookie/crumb authentication that is unreliable in Docker environments.

### Async Concurrency

The service uses `httpx.AsyncClient` (shared, HTTP/2-capable, created at startup). Batch requests — e.g. 50 symbols in `/quotes` or 8 indices in `/indices` — are fetched with `asyncio.gather`, making all Yahoo Finance calls in parallel rather than sequentially. Cold-start for 50 symbols typically completes in 1–3 seconds rather than 30+ seconds.

### In-flight Deduplication

If multiple concurrent requests arrive for the same uncached symbol, only **one** outbound Yahoo Finance request is made. The others wait on an `asyncio.Lock` keyed to `{exchange}:{symbol}` and read the result from cache once it is populated.

### Yahoo Finance Ticker Format

NSE symbols are suffixed `.NS` (e.g. `RELIANCE.NS`). BSE symbols are suffixed `.BO` (e.g. `RELIANCE.BO`). This is handled transparently — callers always use bare symbols like `RELIANCE`.

### Deployment

```bash
# Production
docker compose up -d

# Local development (hot reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The Docker image runs as a non-root user (`appuser`). The `HEALTHCHECK` polls `GET /health` every 30 seconds with a 10-second timeout and 15-second startup grace period.
