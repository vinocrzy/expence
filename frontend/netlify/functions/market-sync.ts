/**
 * Netlify Scheduled Function: Market Sync
 * 
 * Fetches market prices from RapidAPI Indian Stock Exchange API
 * Scheduled to run twice daily:
 * - Market OPEN: 09:20 IST (weekdays)
 * - Market CLOSE: 15:35 IST (weekdays)
 * 
 * IMPORTANT: This function is STATELESS and does NOT access PouchDB
 * Frontend is responsible for storing the returned quotes
 * 
 * SETUP: npm install @netlify/functions (in project root)
 */

/**
 * Netlify Function Types
 * Note: Install @netlify/functions package for full type support
 */
interface HandlerEvent {
  body: string | null;
  headers: Record<string, string>;
  httpMethod: string;
  isBase64Encoded: boolean;
  path: string;
  queryStringParameters: Record<string, string> | null;
}

interface HandlerContext {
  functionName: string;
  functionVersion: string;
  invokedFunctionArn: string;
  memoryLimitInMB: string;
  awsRequestId: string;
  logGroupName: string;
  logStreamName: string;
  identity?: unknown;
  clientContext?: unknown;
}

interface HandlerResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

type Handler = (
  event: HandlerEvent,
  context: HandlerContext
) => Promise<HandlerResponse>;

/**
 * Type definitions
 */
interface SymbolRequest {
  symbol: string;
  exchange: 'NSE' | 'BSE';
}

interface MarketSyncRequest {
  symbols: SymbolRequest[];
  session?: 'OPEN' | 'CLOSE';
}

interface QuoteUpdate {
  symbol: string;
  exchange: 'NSE' | 'BSE';
  price: number;
  timestamp: string;
  change?: number;
  changePercent?: number;
}

interface MarketSyncResponse {
  success: boolean;
  quotes: QuoteUpdate[];
  timestamp: string;
  session?: 'OPEN' | 'CLOSE';
  errors?: string[];
}

/**
 * RapidAPI Indian Stock Exchange Response (adjust based on actual API)
 */
interface RapidAPIStockResponse {
  symbol: string;
  lastPrice: number;
  change: number;
  pChange: number;
  // Add other fields as per actual API response
}

/**
 * Fetch stock quotes from RapidAPI
 */
async function fetchStockQuotesFromRapidAPI(
  symbols: SymbolRequest[]
): Promise<QuoteUpdate[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'indian-stock-exchange-api2.p.rapidapi.com';

  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY environment variable not set');
  }

  const quotes: QuoteUpdate[] = [];
  const errors: string[] = [];
  const timestamp = new Date().toISOString();

  // Group symbols by exchange for batch requests
  const nseSymbols = symbols.filter(s => s.exchange === 'NSE').map(s => s.symbol);
  const bseSymbols = symbols.filter(s => s.exchange === 'BSE').map(s => s.symbol);

  try {
    // Fetch NSE quotes
    if (nseSymbols.length > 0) {
      const nseQuotes = await fetchExchangeQuotes('NSE', nseSymbols, apiKey, apiHost);
      quotes.push(...nseQuotes.map(q => ({ ...q, exchange: 'NSE' as const, timestamp })));
    }

    // Fetch BSE quotes
    if (bseSymbols.length > 0) {
      const bseQuotes = await fetchExchangeQuotes('BSE', bseSymbols, apiKey, apiHost);
      quotes.push(...bseQuotes.map(q => ({ ...q, exchange: 'BSE' as const, timestamp })));
    }
  } catch (error) {
    console.error('RapidAPI fetch error:', error);
    errors.push(error instanceof Error ? error.message : 'Unknown API error');
  }

  return quotes;
}

/**
 * Fetch quotes for a specific exchange
 * 
 * NOTE: Adjust endpoint and response parsing based on actual RapidAPI documentation
 * This is a template implementation
 */
async function fetchExchangeQuotes(
  exchange: 'NSE' | 'BSE',
  symbols: string[],
  apiKey: string,
  apiHost: string
): Promise<Omit<QuoteUpdate, 'exchange' | 'timestamp'>[]> {
  const quotes: Omit<QuoteUpdate, 'exchange' | 'timestamp'>[] = [];

  // RapidAPI may support batch requests or require individual calls
  // Adjust based on actual API capabilities
  
  // Example: Individual symbol fetch (optimize based on API capabilities)
  for (const symbol of symbols) {
    try {
      const url = `https://${apiHost}/stock/${exchange}/${symbol}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': apiHost,
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${exchange}:${symbol}: ${response.status}`);
        continue;
      }

      const data: RapidAPIStockResponse = await response.json();

      quotes.push({
        symbol,
        price: data.lastPrice,
        change: data.change,
        changePercent: data.pChange,
      });

      // Rate limiting: small delay between requests to avoid hitting API limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching ${exchange}:${symbol}:`, error);
    }
  }

  return quotes;
}

/**
 * Main handler function
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<{ statusCode: number; body: string }> => {
  console.log('Market sync function invoked');

  try {
    // Parse request body (for manual invocations)
    let requestBody: MarketSyncRequest | null = null;
    
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: 'Invalid JSON in request body',
          }),
        };
      }
    }

    // If no symbols provided, return empty response
    // (scheduled runs will be triggered by frontend)
    if (!requestBody || !requestBody.symbols || requestBody.symbols.length === 0) {
      console.log('No symbols requested, skipping sync');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          quotes: [],
          timestamp: new Date().toISOString(),
          message: 'No symbols to sync',
        }),
      };
    }

    // Fetch quotes from RapidAPI
    const quotes = await fetchStockQuotesFromRapidAPI(requestBody.symbols);

    const response: MarketSyncResponse = {
      success: true,
      quotes,
      timestamp: new Date().toISOString(),
      session: requestBody.session,
    };

    console.log(`Market sync completed: ${quotes.length} quotes fetched`);

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Market sync error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        quotes: [],
        timestamp: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }),
    };
  }
};

/**
 * Scheduled function configuration
 * 
 * Market OPEN: 09:20 IST (03:50 UTC) - Weekdays
 * Market CLOSE: 15:35 IST (10:05 UTC) - Weekdays
 * 
 * Note: IST is UTC+5:30
 * 
 * Cron format: minute hour day month weekday
 * Weekdays: 1-5 (Monday-Friday)
 */
export const config = {
  schedule: [
    // Market OPEN: 09:20 IST (03:50 UTC) - Monday to Friday
    '50 3 * * 1-5',
    // Market CLOSE: 15:35 IST (10:05 UTC) - Monday to Friday
    '5 10 * * 1-5',
  ],
};

/**
 * DEPLOYMENT NOTES:
 * 
 * 1. Add RAPIDAPI_KEY to Netlify environment variables:
 *    - Go to Site Settings > Environment Variables
 *    - Add: RAPIDAPI_KEY=your_key_here
 *    - Add: RAPIDAPI_HOST=indian-stock-exchange-api2.p.rapidapi.com (or actual host)
 * 
 * 2. Scheduled functions require Netlify Pro plan or higher
 *    If not available, frontend can manually trigger this function twice daily
 * 
 * 3. API endpoint structure should be adjusted based on actual RapidAPI docs:
 *    - Verify exact endpoint URLs
 *    - Verify request/response formats
 *    - Check if batch requests are supported (more efficient)
 * 
 * 4. For manual testing:
 *    curl -X POST https://your-site.netlify.app/.netlify/functions/market-sync \
 *      -H "Content-Type: application/json" \
 *      -d '{"symbols":[{"symbol":"RELIANCE","exchange":"NSE"}]}'
 */
