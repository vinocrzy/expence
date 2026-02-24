/**
 * Stock Portfolio Module - Type Definitions
 * 
 * Strongly typed models for offline-first stock portfolio tracking
 * Using PouchDB for local storage with replication support
 */

/**
 * Core Transaction Types
 */
export type TransactionType = "BUY" | "SELL";
export type Exchange = "NSE" | "BSE";
export type MarketSession = "OPEN" | "CLOSE";

/**
 * Stock Transaction Document
 * 
 * Stored in PouchDB with prefix: stock_txn_
 */
export interface StockTransaction {
  _id: string; // Format: stock_txn_{timestamp}_{uuid}
  _rev?: string; // PouchDB revision
  type: TransactionType;
  symbol: string; // e.g., "RELIANCE", "TCS"
  exchange: Exchange;
  quantity: number; // Number of shares
  price: number; // Price per share at transaction
  charges?: number; // Brokerage, taxes, etc.
  date: string; // ISO date string
  notes?: string;
  householdId?: string; // Multi-user support
  userId?: string;
  createdAt: string; // ISO timestamp
  updatedAt?: string;
}

/**
 * Market Quote Document
 * 
 * Latest cached price per symbol
 * Stored in PouchDB with prefix: quote_
 */
export interface MarketQuote {
  _id: string; // Format: quote_{exchange}_{symbol}
  _rev?: string;
  symbol: string;
  exchange: Exchange;
  price: number; // Current/latest price
  timestamp: string; // ISO timestamp of price
  change?: number; // Price change from previous close
  changePercent?: number;
  volume?: number;
  lastUpdated: string; // ISO timestamp
}

/**
 * Market Snapshot Document
 * 
 * Historical price snapshots for OPEN/CLOSE tracking
 * Stored in PouchDB with prefix: market_
 */
export interface MarketSnapshot {
  _id: string; // Format: market_{date}_{session}_{exchange}_{symbol}
  _rev?: string;
  symbol: string;
  exchange: Exchange;
  date: string; // YYYY-MM-DD
  session: MarketSession;
  price: number;
  timestamp: string; // ISO timestamp
}

/**
 * Portfolio Holding (Derived - Not Stored)
 * 
 * Calculated from transactions + latest quotes
 */
export interface Holding {
  symbol: string;
  exchange: Exchange;
  totalUnits: number; // Current quantity owned
  avgBuyPrice: number; // Weighted average purchase price
  investedValue: number; // Total amount invested (avg * units)
  currentPrice: number; // Latest market price
  currentValue: number; // Current market value (price * units)
  unrealisedPnL: number; // Profit/Loss (currentValue - investedValue)
  unrealisedPnLPercent: number; // PnL percentage
  firstBuyDate: string; // Earliest purchase date
  lastTransactionDate: string; // Most recent transaction
}

/**
 * Portfolio Summary (Derived - Not Stored)
 * 
 * Aggregated portfolio metrics
 */
export interface PortfolioSummary {
  totalInvestment: number; // Sum of all invested values
  totalCurrentValue: number; // Sum of all current values
  totalUnrealisedPnL: number; // Total profit/loss
  totalUnrealisedPnLPercent: number; // Overall PnL percentage
  totalHoldings: number; // Number of unique holdings
  lastUpdated: string; // ISO timestamp
}

/**
 * Portfolio Analytics (Derived)
 * 
 * Advanced metrics for insights and dashboard
 */
export interface PortfolioAnalytics {
  // Daily performance
  todayPnL: number; // Change since market open
  todayPnLPercent: number;
  
  // Top performers
  topGainer: HoldingPerformance | null;
  topLoser: HoldingPerformance | null;
  
  // Diversification
  diversification: DiversificationMetric[];
  
  // Risk metrics
  concentrationRisk: ConcentrationRisk | null;
  
  // Timestamp
  calculatedAt: string;
}

/**
 * Holding Performance Metric
 */
export interface HoldingPerformance {
  symbol: string;
  exchange: Exchange;
  pnl: number;
  pnlPercent: number;
  currentValue: number;
}

/**
 * Diversification Metric
 */
export interface DiversificationMetric {
  symbol: string;
  exchange: Exchange;
  percentage: number; // Percentage of total portfolio value
  value: number;
}

/**
 * Concentration Risk Warning
 */
export interface ConcentrationRisk {
  symbol: string;
  exchange: Exchange;
  percentage: number; // > 40% triggers warning
  value: number;
  message: string;
}

/**
 * Dashboard Widget Data Contract
 * 
 * Optimized data structure for dashboard consumption
 */
export interface PortfolioDashboardData {
  totalInvestment: number;
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  todayPnL: number;
  todayPnLPercent: number;
  topGainer: HoldingPerformance | null;
  topLoser: HoldingPerformance | null;
  lastUpdatedTime: string;
  holdingsCount: number;
  isStale: boolean; // True if data is > 24 hours old
}

/**
 * Market Sync Response
 * 
 * Response from Netlify function
 */
export interface MarketSyncResponse {
  success: boolean;
  quotes: QuoteUpdate[];
  timestamp: string;
  session?: MarketSession;
  errors?: string[];
}

/**
 * Quote Update from API
 */
export interface QuoteUpdate {
  symbol: string;
  exchange: Exchange;
  price: number;
  timestamp: string;
  change?: number;
  changePercent?: number;
}

/**
 * Market Sync Request
 */
export interface MarketSyncRequest {
  symbols: SymbolRequest[];
  session?: MarketSession;
}

/**
 * Symbol Request
 */
export interface SymbolRequest {
  symbol: string;
  exchange: Exchange;
}

/**
 * Repository Query Options
 */
export interface QueryOptions {
  householdId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  symbol?: string;
  exchange?: Exchange;
}

/**
 * Holdings Calculation Input
 */
export interface HoldingsCalculationInput {
  transactions: StockTransaction[];
  quotes: Record<string, MarketQuote>; // Key: {exchange}_{symbol}
}

/**
 * Holdings Calculation Result
 */
export interface HoldingsCalculationResult {
  holdings: Holding[];
  summary: PortfolioSummary;
}

/**
 * Analytics Calculation Input
 */
export interface AnalyticsCalculationInput {
  holdings: Holding[];
  todayOpenQuotes: Record<string, MarketSnapshot>; // Key: {exchange}_{symbol}
  todayCloseQuotes: Record<string, MarketQuote>; // Key: {exchange}_{symbol}
  portfolioSummary: PortfolioSummary;
}

/**
 * Empty State
 */
export interface EmptyPortfolioState {
  hasTransactions: false;
  holdings: [];
  summary: {
    totalInvestment: 0;
    totalCurrentValue: 0;
    totalUnrealisedPnL: 0;
    totalUnrealisedPnLPercent: 0;
    totalHoldings: 0;
    lastUpdated: string;
  };
  analytics: null;
}

/**
 * Error Types
 */
export class PortfolioError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PortfolioError";
  }
}

/**
 * Utility Types
 */
export type SymbolKey = `${Exchange}_${string}`; // e.g., "NSE_RELIANCE"
export type DateString = string; // YYYY-MM-DD
export type ISOTimestamp = string;
