"""
Self-hosted Stock Quote API — Yahoo Finance (no RapidAPI dependency).

Architecture decisions:
  - async httpx: single shared AsyncClient with browser headers; all I/O non-blocking
  - asyncio.gather: all uncached symbols in a batch are fetched concurrently
  - In-flight deduplication: asyncio.Lock per cache-key stops thundering-herd on cold start
  - slowapi: per-IP token-bucket rate limiting (configurable per endpoint)
  - pydantic-settings: typed, validated configuration from env vars
  - TTLCache: separate caches per data category (quotes 5 min, search 1 min,
              history 5–1440 min depending on range, fundamentals 60 min)

Endpoints:
  POST /quotes                — live quotes for a list of symbols (NSE/BSE)
  GET  /search                — symbol/ETF/index search via Yahoo Finance
  GET  /top                   — top gainers, losers, most-active
  GET  /indices               — live data for major Indian indices
  GET  /history/{symbol}      — OHLCV bars (configurable range + interval)
  GET  /fundamentals/{symbol} — key fundamental metrics
  GET  /market-status         — NSE/BSE open/closed status (pure computation)
  GET  /metrics               — operational statistics (cache, hit ratio, uptime)
  GET  /health                — liveness probe (Docker healthcheck)
"""

# NOTE: do NOT add `from __future__ import annotations` here.
# Pydantic v2 + FastAPI require eager annotation resolution for request body models;
# deferred evaluation (PEP 563) breaks forward-reference resolution at schema generation time.

import asyncio
import logging
import re
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional

import httpx
import pytz
from cachetools import TTLCache
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from pydantic_settings import BaseSettings
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ---------------------------------------------------------------------------
# Settings (all overridable via env vars)
# ---------------------------------------------------------------------------


class Settings(BaseSettings):
    cache_ttl_seconds: int = 300
    history_intraday_ttl: int = 300       # range 1d/5d
    history_daily_ttl: int = 1800         # range 1mo–6mo
    history_long_ttl: int = 86400         # range 1y+
    search_cache_ttl: int = 60
    fundamentals_cache_ttl: int = 3600
    top_movers_cache_ttl: int = 300
    max_batch_size: int = 50
    allowed_origins: str = "*"
    rate_quotes: str = "30/minute"
    rate_search: str = "20/minute"
    rate_history: str = "10/minute"
    rate_fundamentals: str = "10/minute"
    rate_top: str = "5/minute"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Caches
# ---------------------------------------------------------------------------
_quote_cache: TTLCache[str, dict] = TTLCache(maxsize=500, ttl=settings.cache_ttl_seconds)
_search_cache: TTLCache[str, dict] = TTLCache(maxsize=200, ttl=settings.search_cache_ttl)
_fundamentals_cache: TTLCache[str, dict] = TTLCache(maxsize=200, ttl=settings.fundamentals_cache_ttl)
_top_cache: TTLCache[str, dict] = TTLCache(maxsize=20, ttl=settings.top_movers_cache_ttl)
_history_cache: TTLCache[str, dict] = TTLCache(maxsize=500, ttl=settings.history_daily_ttl)

# In-flight deduplication: prevent concurrent fetches for the same key
_inflight_locks: dict[str, asyncio.Lock] = {}
_inflight_lock_meta = asyncio.Lock()  # guards _inflight_locks dict creation

# ---------------------------------------------------------------------------
# Metrics counters
# ---------------------------------------------------------------------------
_metrics: dict[str, Any] = {
    "start_time": time.time(),
    "requests": {"quotes": 0, "search": 0, "top": 0, "history": 0, "fundamentals": 0, "indices": 0},
    "cache_hits": 0,
    "cache_misses": 0,
}

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# Shared HTTP session (created once at startup via lifespan)
# ---------------------------------------------------------------------------
_http_client: Optional[httpx.AsyncClient] = None

_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
}

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
EXCHANGE_SUFFIX: dict[str, str] = {"NSE": ".NS", "BSE": ".BO"}

YF_CHART_URL = "https://query2.finance.yahoo.com/v8/finance/chart/{ticker}"
YF_SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search"
YF_SCREENER_URL = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved"
YF_QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote"

SYMBOL_RE = re.compile(r"^[A-Z0-9&\-\.]{1,30}$")

HISTORY_INTRADAY_RANGES = {"1d", "5d"}
HISTORY_LONG_RANGES = {"1y", "2y", "5y", "ytd", "max"}

VALID_RANGES = {"1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "ytd", "max"}
VALID_INTERVALS = {"1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"}

# Interval restrictions by range (Yahoo Finance rules)
RANGE_INTERVAL_MAP: dict[str, list[str]] = {
    "1d":  ["1m", "5m", "15m", "30m", "1h", "1d"],
    "5d":  ["5m", "15m", "30m", "1h", "1d"],
    "1mo": ["1h", "1d"],
    "3mo": ["1d"],
    "6mo": ["1d", "1wk"],
    "1y":  ["1d", "1wk", "1mo"],
    "2y":  ["1d", "1wk", "1mo"],
    "5y":  ["1wk", "1mo"],
    "ytd": ["1d", "1wk", "1mo"],
    "max": ["1wk", "1mo"],
}

# Indian market indices
INDICES: list[dict[str, str]] = [
    {"ticker": "^NSEI",      "name": "NIFTY 50"},
    {"ticker": "^BSESN",     "name": "SENSEX"},
    {"ticker": "^NSEBANK",   "name": "NIFTY BANK"},
    {"ticker": "^CNXIT",     "name": "NIFTY IT"},
    {"ticker": "^NSEMDCP50", "name": "NIFTY MIDCAP 50"},
    {"ticker": "^CNXAUTO",   "name": "NIFTY AUTO"},
    {"ticker": "^CNXPHARMA", "name": "NIFTY PHARMA"},
    {"ticker": "^CNXFMCG",   "name": "NIFTY FMCG"},
]

IST = pytz.timezone("Asia/Kolkata")

# NIFTY 50 constituent symbols (used for Indian top-movers via batch quote fetch)
NIFTY50_SYMBOLS = [
    "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK",
    "BAJAJ-AUTO", "BAJFINANCE", "BAJAJFINSV", "BEL", "BHARTIARTL",
    "BPCL", "BRITANNIA", "CIPLA", "COALINDIA", "DRREDDY",
    "EICHERMOT", "GRASIM", "HCLTECH", "HDFCBANK", "HDFCLIFE",
    "HEROMOTOCO", "HINDALCO", "HINDUNILVR", "ICICIBANK", "INDUSINDBK",
    "INFY", "ITC", "JIOFIN", "JSWSTEEL", "KOTAKBANK",
    "LT", "M&M", "MARUTI", "NESTLEIND", "NTPC",
    "ONGC", "POWERGRID", "RELIANCE", "SBILIFE", "SHRIRAMFIN",
    "SBIN", "SUNPHARMA", "TATACONSUM", "TATAMOTORS", "TATASTEEL",
    "TCS", "TECHM", "TITAN", "TRENT", "ULTRACEMCO",
    "WIPRO",
]

# ---------------------------------------------------------------------------
# Lifespan: startup / shutdown
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _http_client
    _http_client = httpx.AsyncClient(
        headers=_BROWSER_HEADERS,
        timeout=httpx.Timeout(15.0),
        limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
        follow_redirects=True,
    )
    log.info("HTTP client initialised (httpx AsyncClient)")
    yield
    await _http_client.aclose()
    log.info("HTTP client closed")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Stock Quote API",
    version="2.0.0",
    description="Self-hosted Indian stocks (NSE/BSE) API powered by Yahoo Finance.",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class QuoteRequest(BaseModel):
    symbols: list[str]
    exchange: Literal["NSE", "BSE"] = "NSE"

    @field_validator("symbols")
    @classmethod
    def check_size(cls, v: list[str]) -> list[str]:
        if len(v) > settings.max_batch_size:
            raise ValueError(f"Batch too large: max {settings.max_batch_size} symbols")
        return v


class Quote(BaseModel):
    symbol: str
    exchange: str
    price: float
    change: Optional[float] = None
    changePercent: Optional[float] = None
    timestamp: str


class QuoteResponse(BaseModel):
    quotes: list[Quote]
    cachedCount: int
    fetchedCount: int
    timestamp: str


class SearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str
    type: str
    score: Optional[float] = None


class SearchResponse(BaseModel):
    results: list[SearchResult]
    count: int
    query: str
    timestamp: str


class Mover(BaseModel):
    symbol: str
    name: str
    price: float
    change: Optional[float] = None
    changePercent: Optional[float] = None
    volume: Optional[int] = None
    marketCap: Optional[float] = None


class TopMoversResponse(BaseModel):
    gainers: list[Mover]
    losers: list[Mover]
    mostActive: list[Mover]
    exchange: str
    timestamp: str


class IndexQuote(BaseModel):
    ticker: str
    name: str
    price: float
    change: Optional[float] = None
    changePercent: Optional[float] = None
    timestamp: str


class IndicesResponse(BaseModel):
    indices: list[IndexQuote]
    timestamp: str


class OHLCVBar(BaseModel):
    timestamp: str
    open: Optional[float]
    high: Optional[float]
    low: Optional[float]
    close: Optional[float]
    volume: Optional[int]


class HistoryResponse(BaseModel):
    symbol: str
    exchange: str
    range: str
    interval: str
    bars: list[OHLCVBar]
    currency: str
    timezone: str
    timestamp: str


class FundamentalsResponse(BaseModel):
    symbol: str
    exchange: str
    name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    marketCap: Optional[float] = None
    pe: Optional[float] = None
    forwardPE: Optional[float] = None
    eps: Optional[float] = None
    dividendYield: Optional[float] = None
    week52High: Optional[float] = None
    week52Low: Optional[float] = None
    avgVolume: Optional[int] = None
    beta: Optional[float] = None
    debtToEquity: Optional[float] = None
    returnOnEquity: Optional[float] = None
    currentRatio: Optional[float] = None
    grossMargin: Optional[float] = None
    operatingMargin: Optional[float] = None
    timestamp: str


class MarketSession(BaseModel):
    status: str
    nextOpen: Optional[str] = None
    nextClose: Optional[str] = None


class MarketStatusResponse(BaseModel):
    nse: MarketSession
    bse: MarketSession
    currentIST: str
    timestamp: str


class MetricsResponse(BaseModel):
    quoteCacheSize: int
    quoteCacheTTL: int
    quoteCacheMaxSize: int
    searchCacheSize: int
    fundamentalsCacheSize: int
    historyCacheSize: int
    topMoversCacheSize: int
    cacheHits: int
    cacheMisses: int
    cacheHitRatio: float
    requestsByEndpoint: dict[str, int]
    uptime: float
    timestamp: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _yf_ticker(symbol: str, exchange: str) -> str:
    return f"{symbol}{EXCHANGE_SUFFIX.get(exchange, '.NS')}"


def _validate_symbol(symbol: str) -> str:
    sym = symbol.strip().upper()
    if not SYMBOL_RE.match(sym):
        raise HTTPException(status_code=400, detail=f"Invalid symbol: '{symbol}'")
    return sym


async def _get_inflight_lock(key: str) -> asyncio.Lock:
    async with _inflight_lock_meta:
        if key not in _inflight_locks:
            _inflight_locks[key] = asyncio.Lock()
        return _inflight_locks[key]


# ---------------------------------------------------------------------------
# Core fetch: single quote via chart API
# ---------------------------------------------------------------------------


async def _fetch_quote(sym: str, exchange: str) -> Quote:
    """Fetch one quote from Yahoo Finance v8 chart endpoint.
    Uses in-flight lock: concurrent callers for same symbol wait on a single request.
    """
    cache_key = f"{exchange}:{sym}"

    # Serve from cache immediately if available
    if cache_key in _quote_cache:
        _metrics["cache_hits"] += 1
        return Quote(**_quote_cache[cache_key])

    lock = await _get_inflight_lock(cache_key)
    async with lock:
        # Double-check after acquiring lock (another coroutine may have fetched it)
        if cache_key in _quote_cache:
            _metrics["cache_hits"] += 1
            return Quote(**_quote_cache[cache_key])

        _metrics["cache_misses"] += 1
        yf_sym = _yf_ticker(sym, exchange)
        url = YF_CHART_URL.format(ticker=yf_sym)

        resp = await _http_client.get(url, params={"interval": "1d", "range": "5d", "events": "history"})
        resp.raise_for_status()

        data = resp.json()
        chart = data.get("chart", {})
        result = (chart.get("result") or [None])[0]
        if not result:
            error = chart.get("error") or {}
            raise ValueError(f"No chart result for {yf_sym}: {error.get('description', 'unknown')}")

        meta = result.get("meta", {})
        price = float(meta.get("regularMarketPrice") or 0)
        if price <= 0:
            closes = (result.get("indicators", {}).get("quote", [{}]) or [{}])[0].get("close", [])
            closes = [c for c in closes if c is not None]
            price = round(float(closes[-1]), 2) if closes else 0.0

        prev_close = float(meta.get("previousClose") or meta.get("chartPreviousClose") or price)
        change = round(price - prev_close, 2) if prev_close else None
        change_pct = (
            round((change / prev_close) * 100, 2) if (change is not None and prev_close) else None
        )

        q = Quote(
            symbol=sym,
            exchange=exchange,
            price=round(price, 2),
            change=change,
            changePercent=change_pct,
            timestamp=_now_iso(),
        )
        _quote_cache[cache_key] = q.model_dump()
        log.info("Fetched %s/%s: %.2f (Δ%.2f, %.2f%%)", sym, exchange, q.price, q.change or 0, q.changePercent or 0)
        return q


async def _fetch_quotes_batch(symbols: list[str], exchange: str) -> tuple[list[Quote], int, int]:
    """Fetch all symbols concurrently using asyncio.gather.
    Returns (quotes, cached_count, fetched_count).
    """
    cached_before = sum(1 for s in symbols if f"{exchange}:{s}" in _quote_cache)

    async def _safe_fetch(sym: str) -> Quote:
        try:
            return await _fetch_quote(sym, exchange)
        except Exception as e:
            log.warning("Failed %s (%s): %s", sym, _yf_ticker(sym, exchange), e)
            return Quote(symbol=sym, exchange=exchange, price=0.0, timestamp=_now_iso())

    quotes = await asyncio.gather(*[_safe_fetch(s) for s in symbols])
    fetched = len(symbols) - cached_before
    return list(quotes), cached_before, fetched


# ---------------------------------------------------------------------------
# Route: POST /quotes  (unchanged signature — backward compatible)
# ---------------------------------------------------------------------------


@app.post("/quotes", response_model=QuoteResponse)
@limiter.limit(settings.rate_quotes)
async def get_quotes(request: Request, body: QuoteRequest) -> QuoteResponse:
    """Fetch (or serve from cache) live quotes for a list of symbols."""
    _metrics["requests"]["quotes"] += 1
    if not body.symbols:
        raise HTTPException(status_code=400, detail="`symbols` list must not be empty")

    seen: set[str] = set()
    symbols: list[str] = []
    for s in body.symbols:
        s = s.strip().upper()
        if s and s not in seen:
            _validate_symbol(s)
            seen.add(s)
            symbols.append(s)

    quotes, cached_count, fetched_count = await _fetch_quotes_batch(symbols, body.exchange)
    log.info("/quotes %d symbols: %d cached, %d fetched", len(symbols), cached_count, fetched_count)

    return QuoteResponse(
        quotes=quotes,
        cachedCount=cached_count,
        fetchedCount=fetched_count,
        timestamp=_now_iso(),
    )


# ---------------------------------------------------------------------------
# Route: GET /search
# ---------------------------------------------------------------------------


@app.get("/search", response_model=SearchResponse)
@limiter.limit(settings.rate_search)
async def search_symbols(
    request: Request,
    q: str = Query(..., min_length=1, max_length=50, description="Search query (symbol or company name)"),
    type: Literal["stock", "etf", "index", "all"] = Query("all", description="Filter by instrument type"),
    exchange: Literal["NSE", "BSE", "all"] = Query("all", description="Filter by exchange"),
    limit: int = Query(10, ge=1, le=25, description="Max results to return"),
) -> SearchResponse:
    """Search for stocks, ETFs and indices by symbol or name via Yahoo Finance."""
    _metrics["requests"]["search"] += 1

    cache_key = f"search:{q.upper()}:{type}:{exchange}:{limit}"
    if cache_key in _search_cache:
        return SearchResponse(**_search_cache[cache_key])

    params = {
        "q": q,
        "lang": "en-US",
        "region": "IN",
        "quotesCount": min(limit * 3, 25),  # over-fetch then filter
        "newsCount": 0,
        "enableFuzzyQuery": "true",
        "enableCb": "false",
    }

    resp = await _http_client.get(YF_SEARCH_URL, params=params)
    resp.raise_for_status()

    data = resp.json()
    raw_quotes = data.get("quotes", [])

    # Type mapping from Yahoo Finance typeDisp values
    type_map = {
        "Equity": "stock", "EQUITY": "stock",
        "ETF": "etf", "ETP": "etf", "MUTUALFUND": "etf",
        "Index": "index", "INDEX": "index",
    }

    results: list[SearchResult] = []
    for item in raw_quotes:
        sym = item.get("symbol", "")
        name = item.get("longname") or item.get("shortname") or sym
        exch = item.get("exchange", "")
        type_disp = item.get("typeDisp", item.get("quoteType", ""))
        mapped_type = type_map.get(type_disp, type_disp.lower())
        score = item.get("score")

        # Derive readable exchange name from Yahoo ticker suffix
        if sym.endswith(".NS"):
            readable_exch = "NSE"
        elif sym.endswith(".BO"):
            readable_exch = "BSE"
        else:
            readable_exch = exch

        # Apply filters
        if type != "all" and mapped_type != type:
            continue
        if exchange != "all" and readable_exch != exchange:
            continue

        results.append(SearchResult(symbol=sym, name=name, exchange=readable_exch, type=mapped_type, score=score))
        if len(results) >= limit:
            break

    resp_body = SearchResponse(results=results, count=len(results), query=q, timestamp=_now_iso())
    _search_cache[cache_key] = resp_body.model_dump()
    return resp_body


# ---------------------------------------------------------------------------
# Route: GET /top
# ---------------------------------------------------------------------------


def _parse_screener_quote(item: dict) -> Mover:
    sym = item.get("symbol", "")
    price = float(item.get("regularMarketPrice", 0))
    change = item.get("regularMarketChange")
    change_pct = item.get("regularMarketChangePercent")
    volume = item.get("regularMarketVolume")
    market_cap = item.get("marketCap")
    return Mover(
        symbol=sym,
        name=item.get("longName") or item.get("shortName") or sym,
        price=round(price, 2),
        change=round(float(change), 2) if change is not None else None,
        changePercent=round(float(change_pct), 2) if change_pct is not None else None,
        volume=int(volume) if volume else None,
        marketCap=float(market_cap) if market_cap else None,
    )


async def _fetch_screener(scr_id: str, count: int) -> list[dict]:
    params = {"scrIds": scr_id, "region": "IN", "count": count, "lang": "en-US"}
    resp = await _http_client.get(YF_SCREENER_URL, params=params)
    resp.raise_for_status()
    data = resp.json()
    return (
        data.get("finance", {})
            .get("result", [{}])[0]
            .get("quotes", [])
    )


@app.get("/top", response_model=TopMoversResponse)
@limiter.limit(settings.rate_top)
async def top_movers(
    request: Request,
    exchange: Literal["NSE", "BSE", "all"] = Query(
        "NSE",
        description="NSE/BSE: scans NIFTY 50 universe. all: Yahoo Finance US screeners.",
    ),
    count: int = Query(10, ge=5, le=25),
) -> TopMoversResponse:
    """Top gainers, losers and most-active stocks for the day.
    For NSE/BSE: derives rankings from live quotes of the NIFTY 50 universe.
    For 'all': uses Yahoo Finance US market screeners (day_gainers/day_losers/most_actives).
    """
    _metrics["requests"]["top"] += 1

    cache_key = f"top:{exchange}:{count}"
    if cache_key in _top_cache:
        return TopMoversResponse(**_top_cache[cache_key])

    if exchange in ("NSE", "BSE"):
        # Batch-fetch NIFTY 50 quotes and derive rankings
        quotes, _, _ = await _fetch_quotes_batch(NIFTY50_SYMBOLS, exchange)
        valid = [q for q in quotes if q.price > 0]

        def _to_mover(q: Quote) -> Mover:
            return Mover(symbol=q.symbol, name=q.symbol,
                         price=q.price, change=q.change, changePercent=q.changePercent)

        gainers     = sorted([m for m in [_to_mover(q) for q in valid] if (m.changePercent or 0) > 0],
                             key=lambda m: m.changePercent or 0, reverse=True)[:count]
        losers      = sorted([m for m in [_to_mover(q) for q in valid] if (m.changePercent or 0) < 0],
                             key=lambda m: m.changePercent or 0)[:count]
        most_active = sorted([_to_mover(q) for q in valid],
                             key=lambda m: m.changePercent or 0, reverse=True)[:count]
    else:
        # US market screeners
        suffix = None

        gainers_raw, losers_raw, active_raw = await asyncio.gather(
            _fetch_screener("day_gainers", count * 2),
            _fetch_screener("day_losers", count * 2),
            _fetch_screener("most_actives", count * 2),
        )

        def _filter_and_parse(items: list[dict], sort_key: str, reverse: bool) -> list[Mover]:
            filtered = [i for i in items if i.get("symbol", "").endswith(suffix)] if suffix else items
            parsed = [_parse_screener_quote(i) for i in filtered]
            return sorted(parsed, key=lambda m: getattr(m, sort_key) or 0, reverse=reverse)[:count]

        gainers     = _filter_and_parse(gainers_raw, "changePercent", reverse=True)
        losers      = _filter_and_parse(losers_raw,  "changePercent", reverse=False)
        most_active = _filter_and_parse(active_raw,  "volume",        reverse=True)

    body = TopMoversResponse(gainers=gainers, losers=losers, mostActive=most_active, exchange=exchange, timestamp=_now_iso())
    _top_cache[cache_key] = body.model_dump()
    return body


# ---------------------------------------------------------------------------
# Route: GET /indices
# ---------------------------------------------------------------------------


@app.get("/indices", response_model=IndicesResponse)
async def get_indices(request: Request) -> IndicesResponse:
    """Live prices for major Indian indices (NIFTY 50, SENSEX, BANK NIFTY, etc.)."""
    _metrics["requests"]["indices"] += 1

    async def _fetch_index(idx: dict) -> IndexQuote:
        ticker = idx["ticker"]
        name = idx["name"]
        cache_key = f"IDX:{ticker}"

        if cache_key in _quote_cache:
            cached = _quote_cache[cache_key]
            return IndexQuote(
                ticker=ticker, name=name,
                price=cached["price"], change=cached.get("change"),
                changePercent=cached.get("changePercent"),
                timestamp=cached["timestamp"],
            )

        url = YF_CHART_URL.format(ticker=ticker)
        try:
            resp = await _http_client.get(url, params={"interval": "1d", "range": "5d"})
            resp.raise_for_status()
            data = resp.json()
            meta = (data.get("chart", {}).get("result") or [{}])[0].get("meta", {})
            price = float(meta.get("regularMarketPrice") or 0)
            prev = float(meta.get("previousClose") or meta.get("chartPreviousClose") or price)
            change = round(price - prev, 2) if prev else None
            chg_pct = round((change / prev) * 100, 2) if (change is not None and prev) else None

            iq = IndexQuote(ticker=ticker, name=name, price=round(price, 2), change=change,
                            changePercent=chg_pct, timestamp=_now_iso())
            _quote_cache[cache_key] = {"price": iq.price, "change": iq.change,
                                       "changePercent": iq.changePercent, "timestamp": iq.timestamp}
            return iq
        except Exception as e:
            log.warning("Index fetch failed %s: %s", ticker, e)
            return IndexQuote(ticker=ticker, name=name, price=0.0, timestamp=_now_iso())

    indices = await asyncio.gather(*[_fetch_index(idx) for idx in INDICES])
    return IndicesResponse(indices=list(indices), timestamp=_now_iso())


# ---------------------------------------------------------------------------
# Route: GET /history/{symbol}
# ---------------------------------------------------------------------------


@app.get("/history/{symbol}", response_model=HistoryResponse)
@limiter.limit(settings.rate_history)
async def get_history(
    request: Request,
    symbol: str,
    exchange: Literal["NSE", "BSE"] = Query("NSE"),
    range: str = Query("1mo", description="1d | 5d | 1mo | 3mo | 6mo | 1y | 2y | 5y | ytd | max"),
    interval: str = Query("1d", description="1m | 5m | 15m | 30m | 1h | 1d | 1wk | 1mo"),
) -> HistoryResponse:
    """OHLCV historical bars for a symbol (respects Yahoo Finance range/interval constraints)."""
    _metrics["requests"]["history"] += 1
    symbol = _validate_symbol(symbol)

    if range not in VALID_RANGES:
        raise HTTPException(status_code=400, detail=f"Invalid range '{range}'. Valid: {sorted(VALID_RANGES)}")
    if interval not in VALID_INTERVALS:
        raise HTTPException(status_code=400, detail=f"Invalid interval '{interval}'. Valid: {sorted(VALID_INTERVALS)}")
    allowed = RANGE_INTERVAL_MAP.get(range, [])
    if interval not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Interval '{interval}' not valid for range '{range}'. Allowed: {allowed}",
        )

    cache_key = f"hist:{exchange}:{symbol}:{range}:{interval}"
    if cache_key in _history_cache:
        return HistoryResponse(**_history_cache[cache_key])

    yf_sym = _yf_ticker(symbol, exchange)
    url = YF_CHART_URL.format(ticker=yf_sym)
    resp = await _http_client.get(url, params={"interval": interval, "range": range, "events": "history"})
    resp.raise_for_status()

    data = resp.json()
    chart = data.get("chart", {})
    result = (chart.get("result") or [None])[0]
    if not result:
        error = chart.get("error") or {}
        raise HTTPException(status_code=404, detail=f"No data for {yf_sym}: {error.get('description', 'not found')}")

    meta = result.get("meta", {})
    timestamps = result.get("timestamp", []) or []
    quotes_data = (result.get("indicators", {}).get("quote") or [{}])[0]

    opens  = quotes_data.get("open",   [None] * len(timestamps))
    highs  = quotes_data.get("high",   [None] * len(timestamps))
    lows   = quotes_data.get("low",    [None] * len(timestamps))
    closes = quotes_data.get("close",  [None] * len(timestamps))
    vols   = quotes_data.get("volume", [None] * len(timestamps))

    bars = [
        OHLCVBar(
            timestamp=datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
            open=round(float(o), 2) if o is not None else None,
            high=round(float(h), 2) if h is not None else None,
            low=round(float(l), 2)  if l is not None else None,
            close=round(float(c), 2) if c is not None else None,
            volume=int(v) if v is not None else None,
        )
        for ts, o, h, l, c, v in zip(timestamps, opens, highs, lows, closes, vols)
    ]

    body = HistoryResponse(
        symbol=symbol, exchange=exchange, range=range, interval=interval,
        bars=bars,
        currency=meta.get("currency", "INR"),
        timezone=meta.get("exchangeTimezoneName", "Asia/Kolkata"),
        timestamp=_now_iso(),
    )
    _history_cache[cache_key] = body.model_dump()
    return body


# ---------------------------------------------------------------------------
# Route: GET /fundamentals/{symbol}
# ---------------------------------------------------------------------------


@app.get("/fundamentals/{symbol}", response_model=FundamentalsResponse)
@limiter.limit(settings.rate_fundamentals)
async def get_fundamentals(
    request: Request,
    symbol: str,
    exchange: Literal["NSE", "BSE"] = Query("NSE"),
) -> FundamentalsResponse:
    """Key fundamental metrics extracted from Yahoo Finance chart meta (PE, EPS, market cap,
    dividend yield, 52-week range, beta). Uses the same v8 chart endpoint as /quotes so
    it is always accessible without cookie/crumb authentication.
    """
    _metrics["requests"]["fundamentals"] += 1
    symbol = _validate_symbol(symbol)

    cache_key = f"fund:{exchange}:{symbol}"
    if cache_key in _fundamentals_cache:
        return FundamentalsResponse(**_fundamentals_cache[cache_key])

    yf_sym = _yf_ticker(symbol, exchange)
    url = YF_CHART_URL.format(ticker=yf_sym)

    # Fetching with a 1-year range causes Yahoo to include more meta fields
    resp = await _http_client.get(url, params={"interval": "1d", "range": "1y", "events": "div,split"})
    resp.raise_for_status()

    data = resp.json()
    chart = data.get("chart", {})
    result = (chart.get("result") or [None])[0]
    if not result:
        error = chart.get("error") or {}
        raise HTTPException(status_code=404, detail=f"No data for {yf_sym}: {error.get('description', 'not found')}")

    meta = result.get("meta", {})

    def _m(key: str) -> Optional[float]:
        v = meta.get(key)
        return float(v) if v is not None else None

    body = FundamentalsResponse(
        symbol=symbol,
        exchange=exchange,
        name=meta.get("longName") or meta.get("shortName") or yf_sym,
        marketCap=_m("marketCap"),
        pe=_m("trailingPE"),
        forwardPE=_m("forwardPE"),
        eps=_m("epsTrailingTwelveMonths"),
        dividendYield=_m("trailingAnnualDividendYield"),
        week52High=_m("fiftyTwoWeekHigh"),
        week52Low=_m("fiftyTwoWeekLow"),
        avgVolume=int(meta.get("averageDailyVolume10Day") or meta.get("regularMarketVolume") or 0) or None,
        beta=_m("beta"),
        timestamp=_now_iso(),
    )
    _fundamentals_cache[cache_key] = body.model_dump()
    return body


# ---------------------------------------------------------------------------
# Route: GET /market-status   (pure computation — no external call)
# ---------------------------------------------------------------------------


def _market_session(now_ist: datetime) -> MarketSession:
    """Compute NSE/BSE session status for a given IST datetime."""
    weekday = now_ist.weekday()  # 0=Mon … 6=Sun
    current_minutes = now_ist.hour * 60 + now_ist.minute

    PRE_START  = 9 * 60         # 09:00
    MKT_OPEN   = 9 * 60 + 15   # 09:15
    MKT_CLOSE  = 15 * 60 + 30  # 15:30
    POST_END   = 16 * 60        # 16:00

    is_weekday = weekday < 5

    if not is_weekday or current_minutes >= POST_END or current_minutes < PRE_START:
        status = "closed"
    elif MKT_OPEN <= current_minutes < MKT_CLOSE:
        status = "open"
    elif PRE_START <= current_minutes < MKT_OPEN:
        status = "pre-market"
    else:
        status = "post-market"

    # Compute next open (next weekday 09:15 IST)
    days_ahead = 1
    if weekday == 4 and current_minutes >= MKT_OPEN:
        days_ahead = 3   # Fri after open → Mon
    elif weekday == 5:
        days_ahead = 2   # Sat → Mon
    elif weekday == 6:
        days_ahead = 1   # Sun → Mon

    next_open_dt = (now_ist + timedelta(days=days_ahead)).replace(
        hour=9, minute=15, second=0, microsecond=0
    )
    next_close_dt = now_ist.replace(hour=15, minute=30, second=0, microsecond=0)

    return MarketSession(
        status=status,
        nextOpen=next_open_dt.isoformat() if status != "open" else None,
        nextClose=next_close_dt.isoformat() if status == "open" else None,
    )


@app.get("/market-status", response_model=MarketStatusResponse)
async def market_status(request: Request) -> MarketStatusResponse:
    """NSE/BSE market session status based on IST clock (no external API call)."""
    now_ist = datetime.now(IST)
    session = _market_session(now_ist)
    return MarketStatusResponse(
        nse=session,
        bse=session,  # NSE and BSE share the same trading calendar
        currentIST=now_ist.strftime("%Y-%m-%dT%H:%M:%S%z"),
        timestamp=_now_iso(),
    )


# ---------------------------------------------------------------------------
# Route: GET /metrics
# ---------------------------------------------------------------------------


@app.get("/metrics", response_model=MetricsResponse)
async def metrics(request: Request) -> MetricsResponse:
    """Operational metrics: cache stats, request counters, uptime."""
    total = _metrics["cache_hits"] + _metrics["cache_misses"]
    hit_ratio = round(_metrics["cache_hits"] / total, 4) if total else 0.0
    return MetricsResponse(
        quoteCacheSize=len(_quote_cache),
        quoteCacheTTL=settings.cache_ttl_seconds,
        quoteCacheMaxSize=_quote_cache.maxsize,
        searchCacheSize=len(_search_cache),
        fundamentalsCacheSize=len(_fundamentals_cache),
        historyCacheSize=len(_history_cache),
        topMoversCacheSize=len(_top_cache),
        cacheHits=_metrics["cache_hits"],
        cacheMisses=_metrics["cache_misses"],
        cacheHitRatio=hit_ratio,
        requestsByEndpoint=dict(_metrics["requests"]),
        uptime=round(time.time() - _metrics["start_time"], 2),
        timestamp=_now_iso(),
    )


# ---------------------------------------------------------------------------
# Route: GET /health  (unchanged — Docker healthcheck)
# ---------------------------------------------------------------------------


@app.get("/health")
async def health() -> dict:
    """Liveness probe."""
    return {
        "status": "ok",
        "version": "2.0.0",
        "cacheSize": len(_quote_cache),
        "cacheTTL": settings.cache_ttl_seconds,
        "timestamp": _now_iso(),
    }
