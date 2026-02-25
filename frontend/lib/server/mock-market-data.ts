/**
 * Mock Market Data Generator
 * 
 * Generates realistic market data for development and testing
 * No API key required - perfect for local development
 */

export interface MockStockData {
  symbol: string;
  exchange: string;
  lastPrice: number;
  change: number;
  changePercent: number;
}

/**
 * Base prices for common Indian stocks (NSE)
 * These will be used as starting points for price generation
 */
const BASE_PRICES: Record<string, number> = {
  // Top Indian stocks by market cap
  'RELIANCE': 2450.50,
  'TCS': 3680.75,
  'INFY': 1520.30,
  'HDFCBANK': 1645.80,
  'ICICIBANK': 985.25,
  'BHARTIARTL': 875.60,
  'ITC': 425.15,
  'SBIN': 612.40,
  'LT': 3285.90,
  'HINDUNILVR': 2395.70,
  'KOTAKBANK': 1845.30,
  'AXISBANK': 925.60,
  'BAJFINANCE': 6820.45,
  'MARUTI': 10250.80,
  'ASIANPAINT': 3105.25,
  'TITAN': 3215.90,
  'ULTRACEMCO': 8450.30,
  'NESTLEIND': 22850.75,
  'WIPRO': 445.80,
  'SUNPHARMA': 1385.60,
  'TECHM': 1245.30,
  'HCLTECH': 1235.90,
  'POWERGRID': 245.80,
  'NTPC': 285.40,
  'ONGC': 185.75,
  'COALINDIA': 325.60,
  'TATAMOTORS': 765.40,
  'TATASTEEL': 135.80,
  'JSWSTEEL': 845.30,
  'HINDALCO': 485.60,
};

/**
 * Generate realistic market data with random fluctuations
 */
export function generateMockMarketData(symbols: string[]): MockStockData[] {
  // Overall market trend for this session (-2% to +2%)
  const marketTrend = (Math.random() - 0.5) * 0.04;
  
  return symbols.map(symbol => {
    // Get base price or generate random one
    const basePrice = BASE_PRICES[symbol] || (500 + Math.random() * 1500);
    
    // Individual stock movement (-5% to +5%)
    const individualChange = (Math.random() - 0.5) * 0.10;
    
    // Combined movement
    const totalChange = marketTrend + individualChange;
    
    // Calculate new price
    const newPrice = basePrice * (1 + totalChange);
    const change = newPrice - basePrice;
    const changePercent = (change / basePrice) * 100;
    
    return {
      symbol,
      exchange: 'NSE',
      lastPrice: Math.round(newPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  });
}

/**
 * Check if we should use mock data.
 *
 * Mock mode is active when:
 *  - USE_MOCK_DATA=true  (explicit override, useful in local dev without Docker)
 *  - STOCK_API_URL is not set  (service not configured)
 *
 * NODE_ENV=development no longer forces mock by itself, so you can run
 * the real stock-api container locally and still get live prices.
 */
export function shouldUseMock(): boolean {
  return (
    process.env.USE_MOCK_DATA === 'true' ||
    !process.env.STOCK_API_URL
  );
}

/**
 * Simulate API delay (for realistic testing)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get default symbols if none provided
 */
export function getDefaultSymbols(): string[] {
  const envSymbols = process.env.ACTIVE_SYMBOLS;
  if (envSymbols) {
    return envSymbols.split(',').map(s => s.trim());
  }
  
  // Default to major stocks
  return [
    'RELIANCE',
    'TCS',
    'INFY',
    'HDFCBANK',
    'ICICIBANK',
    'BHARTIARTL',
    'ITC',
    'SBIN',
  ];
}
