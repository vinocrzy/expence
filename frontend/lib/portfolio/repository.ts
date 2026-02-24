/**
 * Stock Portfolio Repository Layer
 * 
 * PouchDB operations for stock transactions, market quotes, and snapshots
 * Follows offline-first architecture with document prefixes
 */

import {
  StockTransaction,
  MarketQuote,
  MarketSnapshot,
  QueryOptions,
  QuoteUpdate,
  SymbolRequest,
  Exchange,
  MarketSession,
  PortfolioError,
} from './types';
import { portfolioDB } from '../pouchdb';

// Use shared portfolioDB instance from pouchdb.ts
export { portfolioDB } from '../pouchdb';

// Portfolio DB initialization is handled in lib/pouchdb.ts initDB()
// Indexes are created there for consistency with other collections

/**
 * Generate unique ID for stock transaction
 */
const generateTransactionId = (): string => {
  return `stock_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate ID for market quote
 */
const generateQuoteId = (exchange: Exchange, symbol: string): string => {
  return `quote_${exchange}_${symbol}`;
};

/**
 * Generate ID for market snapshot
 */
const generateSnapshotId = (
  date: string,
  session: MarketSession,
  exchange: Exchange,
  symbol: string
): string => {
  return `market_${date}_${session}_${exchange}_${symbol}`;
};

/**
 * STOCK TRANSACTIONS
 */

/**
 * Add a new stock transaction
 */
export const addStockTransaction = async (
  transaction: Omit<StockTransaction, '_id' | 'createdAt'>
): Promise<StockTransaction> => {
  if (typeof window === 'undefined') {
    throw new PortfolioError('Cannot access DB on server', 'SSR_ERROR');
  }

  const now = new Date().toISOString();
  const doc: StockTransaction = {
    ...transaction,
    _id: generateTransactionId(),
    createdAt: now,
    updatedAt: now,
  };

  try {
    const response = await portfolioDB.put(doc);
    return { ...doc, _rev: response.rev };
  } catch (error) {
    console.error('Failed to add stock transaction:', error);
    throw new PortfolioError(
      'Failed to save transaction',
      'TRANSACTION_SAVE_ERROR',
      { error }
    );
  }
};

/**
 * Update an existing stock transaction
 */
export const updateStockTransaction = async (
  transaction: StockTransaction
): Promise<StockTransaction> => {
  if (typeof window === 'undefined') {
    throw new PortfolioError('Cannot access DB on server', 'SSR_ERROR');
  }

  const updated = {
    ...transaction,
    updatedAt: new Date().toISOString(),
  };

  try {
    const response = await portfolioDB.put(updated);
    return { ...updated, _rev: response.rev };
  } catch (error) {
    console.error('Failed to update stock transaction:', error);
    throw new PortfolioError(
      'Failed to update transaction',
      'TRANSACTION_UPDATE_ERROR',
      { error }
    );
  }
};

/**
 * Delete a stock transaction
 */
export const deleteStockTransaction = async (id: string): Promise<void> => {
  if (typeof window === 'undefined') {
    throw new PortfolioError('Cannot access DB on server', 'SSR_ERROR');
  }

  try {
    const doc = await portfolioDB.get(id);
    await portfolioDB.remove(doc);
  } catch (error) {
    console.error('Failed to delete stock transaction:', error);
    throw new PortfolioError(
      'Failed to delete transaction',
      'TRANSACTION_DELETE_ERROR',
      { error }
    );
  }
};

/**
 * Get stock transactions by household
 */
export const getStockTransactionsByHousehold = async (
  options: QueryOptions = {}
): Promise<StockTransaction[]> => {
  if (typeof window === 'undefined') return [];

  try {
    const selector: Record<string, unknown> = {};

    // Note: Removed _id regex filter to allow index usage
    // All stock transactions use stock_txn_ prefix by convention

    if (options.householdId) {
      selector.householdId = options.householdId;
    }

    if (options.symbol) {
      selector.symbol = options.symbol;
    }

    if (options.exchange) {
      selector.exchange = options.exchange;
    }

    if (options.startDate || options.endDate) {
      selector.date = {};
      if (options.startDate) {
        (selector.date as Record<string, string>).$gte = options.startDate;
      }
      if (options.endDate) {
        (selector.date as Record<string, string>).$lte = options.endDate;
      }
    }

    // Ensure date field exists for sorting (required by PouchDB index)
    if (!selector.date) {
      selector.date = { $gte: null };
    }

    // Determine which index to use based on selector
    let sort: any[];
    if (options.householdId) {
      // Use householdId + date composite index
      sort = [{ householdId: 'desc' }, { date: 'desc' }];
    } else if (options.symbol) {
      // Use symbol + date composite index
      sort = [{ symbol: 'desc' }, { date: 'desc' }];
    } else {
      // Use date-only index
      sort = [{ date: 'desc' }];
    }

    const result = await portfolioDB.find({
      selector,
      sort,
    });

    // Filter results to only stock transactions (safety check)
    const stocks = result.docs.filter((doc: any) => 
      doc._id?.startsWith('stock_txn_')
    );

    return stocks as StockTransaction[];
  } catch (error) {
    console.error('Failed to fetch stock transactions:', error);
    throw new PortfolioError(
      'Failed to fetch transactions',
      'TRANSACTION_FETCH_ERROR',
      { error }
    );
  }
};

/**
 * Get all unique symbols from transactions
 */
export const getUniqueSymbols = async (
  householdId?: string
): Promise<SymbolRequest[]> => {
  if (typeof window === 'undefined') return [];

  try {
    const transactions = await getStockTransactionsByHousehold({ householdId });
    const symbolMap = new Map<string, SymbolRequest>();

    transactions.forEach((txn) => {
      const key = `${txn.exchange}_${txn.symbol}`;
      if (!symbolMap.has(key)) {
        symbolMap.set(key, {
          symbol: txn.symbol,
          exchange: txn.exchange,
        });
      }
    });

    return Array.from(symbolMap.values());
  } catch (error) {
    console.error('Failed to get unique symbols:', error);
    return [];
  }
};

/**
 * MARKET QUOTES
 */

/**
 * Upsert market quotes (latest prices)
 */
export const upsertMarketQuotes = async (
  quotes: QuoteUpdate[]
): Promise<void> => {
  if (typeof window === 'undefined') return;

  const now = new Date().toISOString();

  try {
    const updates = quotes.map(async (quote) => {
      const id = generateQuoteId(quote.exchange, quote.symbol);
      
      try {
        const existing = await portfolioDB.get(id);
        const updated: MarketQuote = {
          ...existing,
          price: quote.price,
          timestamp: quote.timestamp,
          change: quote.change,
          changePercent: quote.changePercent,
          lastUpdated: now,
        } as MarketQuote;
        
        return portfolioDB.put(updated);
      } catch (error) {
        // Document doesn't exist, create new
        const newQuote: MarketQuote = {
          _id: id,
          symbol: quote.symbol,
          exchange: quote.exchange,
          price: quote.price,
          timestamp: quote.timestamp,
          change: quote.change,
          changePercent: quote.changePercent,
          lastUpdated: now,
        };
        
        return portfolioDB.put(newQuote);
      }
    });

    await Promise.all(updates);
  } catch (error) {
    console.error('Failed to upsert market quotes:', error);
    throw new PortfolioError(
      'Failed to update market quotes',
      'QUOTE_UPDATE_ERROR',
      { error }
    );
  }
};

/**
 * Get latest quotes for symbols
 */
export const getLatestQuotes = async (
  symbols?: SymbolRequest[]
): Promise<Record<string, MarketQuote>> => {
  if (typeof window === 'undefined') return {};

  try {
    const selector: Record<string, unknown> = {
      _id: { $regex: '^quote_' },
    };

    const result = await portfolioDB.find({ selector });
    const quotes: Record<string, MarketQuote> = {};

    result.docs.forEach((doc) => {
      const quote = doc as MarketQuote;
      const key = `${quote.exchange}_${quote.symbol}`;
      
      // Filter by symbols if provided
      if (!symbols || symbols.some(s => s.symbol === quote.symbol && s.exchange === quote.exchange)) {
        quotes[key] = quote;
      }
    });

    return quotes;
  } catch (error) {
    console.error('Failed to fetch latest quotes:', error);
    throw new PortfolioError(
      'Failed to fetch quotes',
      'QUOTE_FETCH_ERROR',
      { error }
    );
  }
};

/**
 * Get a single quote
 */
export const getQuote = async (
  exchange: Exchange,
  symbol: string
): Promise<MarketQuote | null> => {
  if (typeof window === 'undefined') return null;

  try {
    const id = generateQuoteId(exchange, symbol);
    const doc = await portfolioDB.get(id);
    return doc as MarketQuote;
  } catch (error) {
    // Quote doesn't exist
    return null;
  }
};

/**
 * MARKET SNAPSHOTS
 */

/**
 * Store market snapshot (OPEN/CLOSE prices)
 */
export const storeMarketSnapshot = async (
  date: string,
  session: MarketSession,
  quotes: QuoteUpdate[]
): Promise<void> => {
  if (typeof window === 'undefined') return;

  const now = new Date().toISOString();

  try {
    const snapshots = quotes.map((quote) => {
      const id = generateSnapshotId(date, session, quote.exchange, quote.symbol);
      
      const snapshot: MarketSnapshot = {
        _id: id,
        symbol: quote.symbol,
        exchange: quote.exchange,
        date,
        session,
        price: quote.price,
        timestamp: now,
      };
      
      return portfolioDB.put(snapshot);
    });

    await Promise.all(snapshots);
  } catch (error) {
    console.error('Failed to store market snapshot:', error);
    throw new PortfolioError(
      'Failed to store snapshot',
      'SNAPSHOT_STORE_ERROR',
      { error }
    );
  }
};

/**
 * Get market snapshots for a specific date and session
 */
export const getMarketSnapshots = async (
  date: string,
  session: MarketSession
): Promise<Record<string, MarketSnapshot>> => {
  if (typeof window === 'undefined') return {};

  try {
    const prefix = `market_${date}_${session}_`;
    const selector = {
      _id: { $regex: `^${prefix}` },
    };

    const result = await portfolioDB.find({ selector });
    const snapshots: Record<string, MarketSnapshot> = {};

    result.docs.forEach((doc) => {
      const snapshot = doc as MarketSnapshot;
      const key = `${snapshot.exchange}_${snapshot.symbol}`;
      snapshots[key] = snapshot;
    });

    return snapshots;
  } catch (error) {
    console.error('Failed to fetch market snapshots:', error);
    return {};
  }
};

/**
 * Check if today's CLOSE snapshot exists
 */
export const hasTodayCloseSnapshot = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const snapshots = await getMarketSnapshots(today, 'CLOSE');
  
  return Object.keys(snapshots).length > 0;
};

/**
 * UTILITY FUNCTIONS
 */

/**
 * Get all portfolio documents (for debugging)
 */
export const getAllPortfolioDocuments = async (): Promise<unknown[]> => {
  if (typeof window === 'undefined') return [];

  try {
    const result = await portfolioDB.allDocs({ include_docs: true });
    return result.rows.map(row => row.doc);
  } catch (error) {
    console.error('Failed to fetch all documents:', error);
    return [];
  }
};

/**
 * Clear all portfolio data (for testing/reset)
 */
export const clearPortfolioData = async (): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    const result = await portfolioDB.allDocs();
    const deletions = result.rows.map(row =>
      portfolioDB.remove(row.id, row.value.rev)
    );
    await Promise.all(deletions);
    console.log('Portfolio data cleared');
  } catch (error) {
    console.error('Failed to clear portfolio data:', error);
    throw new PortfolioError(
      'Failed to clear data',
      'DATA_CLEAR_ERROR',
      { error }
    );
  }
};
