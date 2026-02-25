"""
Self-hosted Stock Quote API using Yahoo Finance chart API directly.
Replaces RapidAPI dependency for NSE/BSE Indian stock data.

We call Yahoo Finance v8 chart API with requests (browser User-Agent)
instead of using the yfinance library, which has unreliable internal
ticker-validation steps that break inside Docker containers.

Endpoints:
  POST /quotes  - Fetch live quotes for a list of symbols
  GET  /health  - Liveness probe

Caching:
  TTLCache with a 5-minute TTL per (symbol, exchange) pair.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Literal, Optional

import requests
from cachetools import TTLCache
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cache  (max 500 symbols, 5-minute TTL)
# ---------------------------------------------------------------------------
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "300"))
_cache: TTLCache[str, dict] = TTLCache(maxsize=500, ttl=CACHE_TTL)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Stock Quote API", version="1.0.0")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
Exchange = Literal["NSE", "BSE"]

EXCHANGE_SUFFIX: dict[str, str] = {
    "NSE": ".NS",
    "BSE": ".BO",
}

# Yahoo Finance v8 chart endpoint
YF_CHART_URL = "https://query2.finance.yahoo.com/v8/finance/chart/{ticker}"
YF_CHART_PARAMS = {"interval": "1d", "range": "5d", "events": "history"}

# Browser-like headers so Yahoo Finance serves real data
_HEADERS = {
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
# Models
# ---------------------------------------------------------------------------


class QuoteRequest(BaseModel):
    symbols: list[str]
    exchange: Exchange = "NSE"


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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _cache_key(symbol: str, exchange: str) -> str:
    return f"{exchange}:{symbol}"


def _yf_ticker(symbol: str, exchange: str) -> str:
    return f"{symbol}{EXCHANGE_SUFFIX.get(exchange, '.NS')}"


def _fetch_one(session: requests.Session, sym: str, exchange: str) -> Quote:
    """Fetch a single quote via Yahoo Finance chart API."""
    yf_sym = _yf_ticker(sym, exchange)
    url = YF_CHART_URL.format(ticker=yf_sym)

    resp = session.get(url, params=YF_CHART_PARAMS, timeout=15)
    resp.raise_for_status()

    data = resp.json()
    chart = data.get("chart", {})
    result = (chart.get("result") or [None])[0]
    if not result:
        error = chart.get("error") or {}
        raise ValueError(
            f"No chart result for {yf_sym}: {error.get('description', 'unknown')}"
        )

    meta = result.get("meta", {})

    price = float(meta.get("regularMarketPrice") or 0)
    if price <= 0:
        closes = (
            (result.get("indicators", {}).get("quote", [{}]) or [{}])[0].get("close", [])
        )
        closes = [c for c in closes if c is not None]
        price = round(float(closes[-1]), 2) if closes else 0.0

    prev_close = float(
        meta.get("previousClose") or meta.get("chartPreviousClose") or price
    )
    change = round(price - prev_close, 2) if prev_close else None
    change_pct = (
        round((change / prev_close) * 100, 2)
        if (change is not None and prev_close)
        else None
    )

    return Quote(
        symbol=sym,
        exchange=exchange,
        price=round(price, 2),
        change=change,
        changePercent=change_pct,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


def _fetch_quotes(symbols: list[str], exchange: str) -> list[Quote]:
    """Serve cached quotes where available; fetch the rest from Yahoo Finance."""
    uncached: list[str] = []
    results: list[Quote] = []

    for sym in symbols:
        key = _cache_key(sym, exchange)
        if key in _cache:
            results.append(Quote(**_cache[key]))
            log.debug("Cache HIT: %s", key)
        else:
            uncached.append(sym)

    if not uncached:
        log.info("All %d symbols served from cache", len(results))
        return results

    log.info("Fetching %d symbols from Yahoo Finance: %s", len(uncached), uncached)
    session = requests.Session()
    session.headers.update(_HEADERS)

    for sym in uncached:
        try:
            q = _fetch_one(session, sym, exchange)
            _cache[_cache_key(sym, exchange)] = q.model_dump()
            results.append(q)
            log.info(
                "Fetched %s: %.2f (change %.2f, %.2f%%)",
                sym, q.price, q.change or 0, q.changePercent or 0,
            )
        except Exception as e:
            log.warning(
                "Failed to fetch %s (%s): %s", sym, _yf_ticker(sym, exchange), e
            )
            results.append(
                Quote(
                    symbol=sym,
                    exchange=exchange,
                    price=0.0,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )
            )

    return results


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.post("/quotes", response_model=QuoteResponse)
def get_quotes(body: QuoteRequest) -> QuoteResponse:
    """Fetch (or serve from cache) live quotes for the requested symbols."""
    if not body.symbols:
        raise HTTPException(status_code=400, detail="`symbols` list must not be empty")

    seen: set[str] = set()
    symbols: list[str] = []
    for s in body.symbols:
        s = s.strip().upper()
        if s and s not in seen:
            seen.add(s)
            symbols.append(s)

    cached_before = sum(1 for s in symbols if _cache_key(s, body.exchange) in _cache)
    quotes = _fetch_quotes(symbols, body.exchange)

    return QuoteResponse(
        quotes=quotes,
        cachedCount=cached_before,
        fetchedCount=len(symbols) - cached_before,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/health")
def health() -> dict:
    """Liveness probe."""
    return {
        "status": "ok",
        "cacheSize": len(_cache),
        "cacheTTL": CACHE_TTL,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
