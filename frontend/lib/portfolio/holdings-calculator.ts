/**
 * Holdings Calculator Engine
 * 
 * Pure functions for calculating stock holdings, P&L, and portfolio summary
 * Uses weighted average method for partial sells
 * 
 * IMPORTANT: All functions are pure - no side effects, no DB access
 */

import type {
  StockTransaction,
  MarketQuote,
  Holding,
  PortfolioSummary,
  HoldingsCalculationInput,
  HoldingsCalculationResult,
  Exchange,
} from './types';

/**
 * Internal holding state during calculation
 */
interface HoldingState {
  symbol: string;
  exchange: Exchange;
  totalUnits: number;
  totalInvested: number; // Total amount paid (including partially sold)
  avgBuyPrice: number;
  firstBuyDate: string;
  lastTransactionDate: string;
}

/**
 * Create a unique key for symbol + exchange
 */
function getSymbolKey(symbol: string, exchange: Exchange): string {
  return `${exchange}_${symbol}`;
}

/**
 * Sort transactions by date (oldest first)
 */
function sortTransactionsByDate(transactions: StockTransaction[]): StockTransaction[] {
  return [...transactions].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

/**
 * Calculate holdings from transactions using weighted average method
 * 
 * Algorithm:
 * 1. Process transactions chronologically
 * 2. For BUY: Add units and update weighted average price
 * 3. For SELL: Reduce units (FIFO or weighted avg - we use weighted avg)
 * 4. If all units sold, remove holding
 */
function calculateHoldingStates(
  transactions: StockTransaction[]
): Map<string, HoldingState> {
  const holdings = new Map<string, HoldingState>();
  
  // Sort transactions chronologically
  const sortedTxns = sortTransactionsByDate(transactions);
  
  for (const txn of sortedTxns) {
    const key = getSymbolKey(txn.symbol, txn.exchange);
    const existing = holdings.get(key);
    
    if (txn.type === 'BUY') {
      if (!existing) {
        // New holding
        const totalCost = txn.price * txn.quantity + (txn.charges || 0);
        holdings.set(key, {
          symbol: txn.symbol,
          exchange: txn.exchange,
          totalUnits: txn.quantity,
          totalInvested: totalCost,
          avgBuyPrice: totalCost / txn.quantity,
          firstBuyDate: txn.date,
          lastTransactionDate: txn.date,
        });
      } else {
        // Add to existing holding - weighted average
        const additionalCost = txn.price * txn.quantity + (txn.charges || 0);
        const newTotalInvested = existing.totalInvested + additionalCost;
        const newTotalUnits = existing.totalUnits + txn.quantity;
        
        holdings.set(key, {
          ...existing,
          totalUnits: newTotalUnits,
          totalInvested: newTotalInvested,
          avgBuyPrice: newTotalInvested / newTotalUnits,
          lastTransactionDate: txn.date,
        });
      }
    } else if (txn.type === 'SELL') {
      if (!existing) {
        console.warn(`SELL transaction for ${key} without BUY - skipping`);
        continue;
      }
      
      if (txn.quantity > existing.totalUnits) {
        console.warn(
          `SELL quantity (${txn.quantity}) exceeds holdings (${existing.totalUnits}) for ${key}`
        );
        // Sell all available units
        holdings.delete(key);
        continue;
      }
      
      // Reduce units and proportionally reduce invested amount
      const newTotalUnits = existing.totalUnits - txn.quantity;
      
      if (newTotalUnits <= 0) {
        // All units sold - remove holding
        holdings.delete(key);
      } else {
        // Partial sell - reduce invested amount proportionally
        const soldRatio = txn.quantity / existing.totalUnits;
        const newTotalInvested = existing.totalInvested * (1 - soldRatio);
        
        holdings.set(key, {
          ...existing,
          totalUnits: newTotalUnits,
          totalInvested: newTotalInvested,
          avgBuyPrice: newTotalInvested / newTotalUnits, // Recalculate avg
          lastTransactionDate: txn.date,
        });
      }
    }
  }
  
  return holdings;
}

/**
 * Convert holding states to full holdings with current prices and P&L
 */
function enrichHoldingsWithPrices(
  holdingStates: Map<string, HoldingState>,
  quotes: Record<string, MarketQuote>
): Holding[] {
  const holdings: Holding[] = [];
  
  for (const [key, state] of holdingStates) {
    const quote = quotes[key];
    
    // If no quote available, use average buy price as fallback
    const currentPrice = quote?.price ?? state.avgBuyPrice;
    
    const investedValue = state.totalInvested;
    const currentValue = currentPrice * state.totalUnits;
    const unrealisedPnL = currentValue - investedValue;
    const unrealisedPnLPercent = investedValue > 0 
      ? (unrealisedPnL / investedValue) * 100 
      : 0;
    
    holdings.push({
      symbol: state.symbol,
      exchange: state.exchange,
      totalUnits: state.totalUnits,
      avgBuyPrice: state.avgBuyPrice,
      investedValue,
      currentPrice,
      currentValue,
      unrealisedPnL,
      unrealisedPnLPercent,
      firstBuyDate: state.firstBuyDate,
      lastTransactionDate: state.lastTransactionDate,
    });
  }
  
  return holdings;
}

/**
 * Calculate portfolio summary from holdings
 */
function calculatePortfolioSummary(holdings: Holding[]): PortfolioSummary {
  if (holdings.length === 0) {
    return {
      totalInvestment: 0,
      totalCurrentValue: 0,
      totalUnrealisedPnL: 0,
      totalUnrealisedPnLPercent: 0,
      totalHoldings: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
  
  const totalInvestment = holdings.reduce(
    (sum, h) => sum + h.investedValue,
    0
  );
  
  const totalCurrentValue = holdings.reduce(
    (sum, h) => sum + h.currentValue,
    0
  );
  
  const totalUnrealisedPnL = totalCurrentValue - totalInvestment;
  
  const totalUnrealisedPnLPercent = totalInvestment > 0
    ? (totalUnrealisedPnL / totalInvestment) * 100
    : 0;
  
  return {
    totalInvestment: roundToTwo(totalInvestment),
    totalCurrentValue: roundToTwo(totalCurrentValue),
    totalUnrealisedPnL: roundToTwo(totalUnrealisedPnL),
    totalUnrealisedPnLPercent: roundToTwo(totalUnrealisedPnLPercent),
    totalHoldings: holdings.length,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Round number to 2 decimal places
 */
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Main function: Calculate holdings and portfolio summary
 * 
 * PURE FUNCTION - No side effects
 * 
 * @param input - Transactions and market quotes
 * @returns Holdings and portfolio summary
 */
export function calculateHoldings(
  input: HoldingsCalculationInput
): HoldingsCalculationResult {
  const { transactions, quotes } = input;
  
  // Handle empty state
  if (transactions.length === 0) {
    return {
      holdings: [],
      summary: {
        totalInvestment: 0,
        totalCurrentValue: 0,
        totalUnrealisedPnL: 0,
        totalUnrealisedPnLPercent: 0,
        totalHoldings: 0,
        lastUpdated: new Date().toISOString(),
      },
    };
  }
  
  // Calculate holding states
  const holdingStates = calculateHoldingStates(transactions);
  
  // Enrich with current prices
  const holdings = enrichHoldingsWithPrices(holdingStates, quotes);
  
  // Calculate summary
  const summary = calculatePortfolioSummary(holdings);
  
  return {
    holdings,
    summary,
  };
}

/**
 * Calculate holding for a specific symbol (useful for detail views)
 */
export function calculateHoldingForSymbol(
  symbol: string,
  exchange: Exchange,
  transactions: StockTransaction[],
  quote: MarketQuote | null
): Holding | null {
  const filteredTxns = transactions.filter(
    txn => txn.symbol === symbol && txn.exchange === exchange
  );
  
  if (filteredTxns.length === 0) return null;
  
  const key = getSymbolKey(symbol, exchange);
  const quotes = quote ? { [key]: quote } : {};
  
  const result = calculateHoldings({
    transactions: filteredTxns,
    quotes,
  });
  
  return result.holdings[0] || null;
}

/**
 * Validate transactions (can be used before saving)
 */
export interface TransactionValidationError {
  field: string;
  message: string;
}

export function validateTransaction(
  transaction: Omit<StockTransaction, '_id' | 'createdAt'>,
  existingTransactions?: StockTransaction[]
): TransactionValidationError[] {
  const errors: TransactionValidationError[] = [];
  
  // Validate quantity
  if (transaction.quantity <= 0) {
    errors.push({
      field: 'quantity',
      message: 'Quantity must be greater than 0',
    });
  }
  
  // Validate price
  if (transaction.price <= 0) {
    errors.push({
      field: 'price',
      message: 'Price must be greater than 0',
    });
  }
  
  // Validate charges
  if (transaction.charges !== undefined && transaction.charges < 0) {
    errors.push({
      field: 'charges',
      message: 'Charges cannot be negative',
    });
  }
  
  // Validate date
  const txnDate = new Date(transaction.date);
  if (isNaN(txnDate.getTime())) {
    errors.push({
      field: 'date',
      message: 'Invalid date format',
    });
  }
  
  // Future date check
  if (txnDate.getTime() > Date.now()) {
    errors.push({
      field: 'date',
      message: 'Date cannot be in the future',
    });
  }
  
  // For SELL transactions, check if sufficient units exist
  if (transaction.type === 'SELL' && existingTransactions) {
    const key = getSymbolKey(transaction.symbol, transaction.exchange);
    const holdings = calculateHoldingStates(existingTransactions);
    const holding = holdings.get(key);
    
    if (!holding) {
      errors.push({
        field: 'quantity',
        message: `No holdings exist for ${transaction.symbol}`,
      });
    } else if (holding.totalUnits < transaction.quantity) {
      errors.push({
        field: 'quantity',
        message: `Cannot sell ${transaction.quantity} units. Only ${holding.totalUnits} units available.`,
      });
    }
  }
  
  return errors;
}

/**
 * Get realized P&L from SELL transactions
 * (difference between sell price and avg buy price)
 */
export function calculateRealizedPnL(
  transactions: StockTransaction[]
): number {
  let realizedPnL = 0;
  const holdingStates = new Map<string, HoldingState>();
  const sortedTxns = sortTransactionsByDate(transactions);
  
  for (const txn of sortedTxns) {
    const key = getSymbolKey(txn.symbol, txn.exchange);
    const existing = holdingStates.get(key);
    
    if (txn.type === 'BUY') {
      if (!existing) {
        const totalCost = txn.price * txn.quantity + (txn.charges || 0);
        holdingStates.set(key, {
          symbol: txn.symbol,
          exchange: txn.exchange,
          totalUnits: txn.quantity,
          totalInvested: totalCost,
          avgBuyPrice: totalCost / txn.quantity,
          firstBuyDate: txn.date,
          lastTransactionDate: txn.date,
        });
      } else {
        const additionalCost = txn.price * txn.quantity + (txn.charges || 0);
        const newTotalUnits = existing.totalUnits + txn.quantity;
        const newTotalInvested = existing.totalInvested + additionalCost;
        
        holdingStates.set(key, {
          ...existing,
          totalUnits: newTotalUnits,
          totalInvested: newTotalInvested,
          avgBuyPrice: newTotalInvested / newTotalUnits,
          lastTransactionDate: txn.date,
        });
      }
    } else if (txn.type === 'SELL' && existing) {
      // Calculate realized P&L
      const sellValue = txn.price * txn.quantity - (txn.charges || 0);
      const costBasis = existing.avgBuyPrice * txn.quantity;
      realizedPnL += sellValue - costBasis;
      
      // Update holding state
      const newTotalUnits = existing.totalUnits - txn.quantity;
      if (newTotalUnits <= 0) {
        holdingStates.delete(key);
      } else {
        const soldRatio = txn.quantity / existing.totalUnits;
        const newTotalInvested = existing.totalInvested * (1 - soldRatio);
        
        holdingStates.set(key, {
          ...existing,
          totalUnits: newTotalUnits,
          totalInvested: newTotalInvested,
          avgBuyPrice: newTotalInvested / newTotalUnits,
          lastTransactionDate: txn.date,
        });
      }
    }
  }
  
  return roundToTwo(realizedPnL);
}

/**
 * Export utility functions for testing
 */
export const utils = {
  getSymbolKey,
  sortTransactionsByDate,
  roundToTwo,
};
