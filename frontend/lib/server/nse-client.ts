/**
 * NSE India API Client
 *
 * Handles cookie-based sessions required by NSE India's website.
 * NSE blocks requests that don't carry a valid browser session cookie.
 *
 * Session lifecycle:
 *  1. GET https://www.nseindia.com  →  captures Set-Cookie headers
 *  2. Subsequent API requests carry those cookies
 *  3. On 401/403, re-establish the session and retry once
 */

const NSE_BASE = 'https://www.nseindia.com';

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

export interface NseQuote {
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
  lastUpdated: string;
  type: 'STOCK' | 'ETF';
  exchange: 'NSE';
}

/**
 * Cookie jar for the session.
 * Stored as a raw "Cookie:" header string, e.g. "nsit=xxx; nseappid=yyy"
 */
let sessionCookies = '';
let sessionEstablishedAt = 0;
const SESSION_TTL_MS = 55_000; // Re-establish every ~55 s (NSE cookies expire ~60 s)

/**
 * Parse Set-Cookie headers from a fetch Response into a flat cookie string.
 */
function parseSetCookies(response: Response): string {
  // Node 18+ fetch exposes Set-Cookie via getSetCookie() or headers.get('set-cookie')
  const raw = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ??
    (response.headers.get('set-cookie') ?? '').split(/,(?=[^ ])/).filter(Boolean);

  return (Array.isArray(raw) ? raw : [raw])
    .map((c: string) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

/**
 * Establish (or re-establish) the NSE browser session by visiting the homepage.
 */
async function establishSession(): Promise<void> {
  console.log('[NSE] Establishing session…');
  const res = await fetch(NSE_BASE, {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
  });

  sessionCookies = parseSetCookies(res);
  sessionEstablishedAt = Date.now();
  console.log(`[NSE] Session ready (cookies: ${sessionCookies.slice(0, 60)}…)`);
}

/**
 * Ensure we have a fresh session before making an API call.
 */
async function ensureSession(): Promise<void> {
  if (!sessionCookies || Date.now() - sessionEstablishedAt > SESSION_TTL_MS) {
    await establishSession();
  }
}

/**
 * Make an authenticated GET request to the NSE API.
 * Retries once with a fresh session on 401/403.
 */
async function nseGet<T>(path: string): Promise<T> {
  await ensureSession();

  const url = `${NSE_BASE}${path}`;
  const doFetch = () =>
    fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        Referer: `${NSE_BASE}/`,
        Cookie: sessionCookies,
      },
      signal: AbortSignal.timeout(15_000),
    });

  let res = await doFetch();

  // Re-auth once on 401/403
  if (res.status === 401 || res.status === 403) {
    console.warn(`[NSE] ${res.status} on ${path} – refreshing session`);
    await establishSession();
    res = await doFetch();
  }

  if (!res.ok) {
    throw new Error(`NSE API ${res.status} ${res.statusText} for ${path}`);
  }

  // Refresh cookies from API responses too
  const fresh = parseSetCookies(res);
  if (fresh) {
    sessionCookies = fresh;
    sessionEstablishedAt = Date.now();
  }

  return res.json() as Promise<T>;
}

// ─── NSE Response Shapes ──────────────────────────────────────────────────────

interface NseIndexData {
  identifier: string;
  symbol: string;
  open: number;
  dayHigh: number;
  dayLow: number;
  lastPrice: number;
  previousClose: number;
  change: number;
  pChange: number;
  totalTradedVolume: number;
  meta?: {
    companyName?: string;
    symbol?: string;
    isin?: string;
    industry?: string;
  };
}

interface NseIndexResponse {
  data: NseIndexData[];
  timestamp: string;
}

interface NseEtfItem {
  symbol: string;
  companyName: string;
  lastPrice?: number;
  open?: number;
  previousClose?: number;
  change?: number;
  pChange?: number;
  totalTradedVolume?: number;
}

interface NseEtfResponse {
  data: NseEtfItem[];
}

interface NseQuoteEquityResponse {
  priceInfo: {
    lastPrice: number;
    open: number;
    previousClose: number;
    change: number;
    pChange: number;
    intraDayHighLow?: {
      max: number;
      min: number;
    };
  };
  info?: {
    companyName?: string;
    symbol?: string;
  };
  securityInfo?: {
    symbol?: string;
  };
  marketDeptOrderBook?: {
    tradeInfo?: {
      totalTradedVolume?: number;
    };
  };
}

// ─── Public helpers ────────────────────────────────────────────────────────────

/**
 * Fetch all constituent quotes for a given index (e.g. "NIFTY 50", "NIFTY 500").
 * NSE encodes spaces as %20 in the index query param.
 */
export async function fetchIndexConstituents(
  index: 'NIFTY 50' | 'NIFTY 500' | 'NIFTY MIDCAP 150'
): Promise<NseQuote[]> {
  const encoded = encodeURIComponent(index);
  const data = await nseGet<NseIndexResponse>(
    `/api/equity-stockIndices?index=${encoded}`
  );

  const now = new Date().toISOString();
  const quotes: NseQuote[] = [];

  for (const item of data.data ?? []) {
    if (!item.symbol) continue;
    quotes.push({
      symbol: item.symbol,
      name: item.meta?.companyName ?? item.symbol,
      price: item.lastPrice ?? 0,
      open: item.open ?? 0,
      previousClose: item.previousClose ?? 0,
      change: item.change ?? 0,
      changePercent: item.pChange ?? 0,
      dayHigh: item.dayHigh ?? 0,
      dayLow: item.dayLow ?? 0,
      volume: item.totalTradedVolume ?? 0,
      lastUpdated: now,
      type: 'STOCK',
      exchange: 'NSE',
    });
  }

  console.log(`[NSE] fetchIndexConstituents(${index}): ${quotes.length} quotes`);
  return quotes;
}

/**
 * Fetch the full NSE ETF list.
 */
export async function fetchEtfList(): Promise<NseQuote[]> {
  const data = await nseGet<NseEtfResponse>('/api/etf');

  const now = new Date().toISOString();
  const quotes: NseQuote[] = [];

  for (const item of data.data ?? []) {
    if (!item.symbol) continue;
    quotes.push({
      symbol: item.symbol,
      name: item.companyName ?? item.symbol,
      price: item.lastPrice ?? 0,
      open: item.open ?? 0,
      previousClose: item.previousClose ?? 0,
      change: item.change ?? 0,
      changePercent: item.pChange ?? 0,
      dayHigh: 0,
      dayLow: 0,
      volume: item.totalTradedVolume ?? 0,
      lastUpdated: now,
      type: 'ETF',
      exchange: 'NSE',
    });
  }

  console.log(`[NSE] fetchEtfList(): ${quotes.length} ETFs`);
  return quotes;
}

/**
 * Fetch a single symbol's quote via the quote-equity endpoint.
 * Used for on-demand cache misses.
 */
export async function fetchSymbolQuote(symbol: string): Promise<NseQuote | null> {
  try {
    const encoded = encodeURIComponent(symbol.toUpperCase());
    const data = await nseGet<NseQuoteEquityResponse>(
      `/api/quote-equity?symbol=${encoded}`
    );

    if (!data.priceInfo) return null;

    const now = new Date().toISOString();
    const p = data.priceInfo;
    const name =
      data.info?.companyName ??
      data.securityInfo?.symbol ??
      symbol;

    return {
      symbol: symbol.toUpperCase(),
      name,
      price: p.lastPrice ?? 0,
      open: p.open ?? 0,
      previousClose: p.previousClose ?? 0,
      change: p.change ?? 0,
      changePercent: p.pChange ?? 0,
      dayHigh: p.intraDayHighLow?.max ?? 0,
      dayLow: p.intraDayHighLow?.min ?? 0,
      volume: data.marketDeptOrderBook?.tradeInfo?.totalTradedVolume ?? 0,
      lastUpdated: now,
      type: 'STOCK',
      exchange: 'NSE',
    };
  } catch (err) {
    console.warn(`[NSE] fetchSymbolQuote(${symbol}) failed:`, err);
    return null;
  }
}
