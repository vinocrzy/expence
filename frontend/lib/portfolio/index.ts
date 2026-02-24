/**
 * Portfolio Module - Public API
 * 
 * Barrel exports for easier imports
 */

// Types
export type {
  StockTransaction,
  MarketQuote,
  MarketSnapshot,
  Holding,
  PortfolioSummary,
  PortfolioAnalytics,
  PortfolioDashboardData,
  HoldingPerformance,
  DiversificationMetric,
  ConcentrationRisk,
  PortfolioError,
  Exchange,
  TransactionType,
  MarketSession,
  SymbolRequest,
  MarketSyncResponse,
  MarketSyncRequest,
  QuoteUpdate,
  QueryOptions,
  HoldingsCalculationInput,
  HoldingsCalculationResult,
  AnalyticsCalculationInput,
} from './types';

// Repository
export {
  portfolioDB,
  // initPortfolioDB removed - using central initDB from pouchdb.ts
  addStockTransaction,
  updateStockTransaction,
  deleteStockTransaction,
  getStockTransactionsByHousehold,
  getUniqueSymbols,
  upsertMarketQuotes,
  getLatestQuotes,
  getQuote,
  storeMarketSnapshot,
  getMarketSnapshots,
  hasTodayCloseSnapshot,
  getAllPortfolioDocuments,
  clearPortfolioData,
} from './repository';

// Holdings Calculator
export {
  calculateHoldings,
  calculateHoldingForSymbol,
  validateTransaction,
  calculateRealizedPnL,
} from './holdings-calculator';

// Analytics
export {
  calculatePortfolioAnalytics,
  calculatePortfolioAnalyticsSimple,
  generatePortfolioInsights,
  calculateRiskScore,
  getPerformanceRating,
  calculateSectorConcentration,
} from './portfolio-analytics';

export type { PortfolioInsight } from './portfolio-analytics';

// Market Sync
export {
  syncMarketPrices,
  syncIfNeeded,
  manualSync,
  isMarketOpen,
  getCurrentMarketSession,
  getLastSyncTime,
  arePricesStale,
  getMarketSyncStatus,
} from './market-sync-service';

export type { MarketSyncStatus } from './market-sync-service';
