export type ReportType = 
  | 'EXPENSE' 
  | 'INCOME' 
  | 'INVESTMENT'
  | 'DEBT'
  | 'ACCOUNT_SUMMARY' 
  | 'LOAN' 
  | 'CREDIT_CARD' 
  | 'BUDGET_VS_ACTUAL' 
  | 'TRIP_EVENT' 
  | 'YEARLY_SUMMARY'
  | 'CONSOLIDATED'
  | 'PORTFOLIO_HOLDINGS'
  | 'PORTFOLIO_PERFORMANCE';

export type ReportFormat = 'EXCEL' | 'PDF';

export interface ReportFilters {
  startDate: string; // ISO Date string
  endDate: string;   // ISO Date string
  accountIds?: string[];
  categoryIds?: string[];
  tags?: string[];
}

export interface TransactionReportData {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  categoryName: string;
  accountName: string;
}

export interface AccountSummaryData {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface LoanReportData {
  id: string;
  name: string;
  principal: number;
  remainingBalance: number;
  emi: number;
}

export interface CreditCardReportData {
  id: string;
  name: string;
  creditLimit: number;
  currentOutstanding: number;
}

export interface BudgetReportData {
  id: string;
  name: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
}

export interface YearlySummaryData {
  month: string;
  income: number;
  expense: number;
  savings: number;
}

export interface ConsolidatedAccountSummary {
  accountId: string;
  accountName: string;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: Record<string, string | number>;
  categoryBreakdown?: Record<string, number>;
  investmentBreakdown?: Record<string, number>;
  debtBreakdown?: Record<string, number>;
  consolidatedSummary?: ConsolidatedAccountSummary[];
  // Portfolio
  portfolioHoldings?: PortfolioHoldingReportRow[];
  portfolioSummary?: PortfolioSummaryReportData;
}

export interface PortfolioHoldingReportRow {
  symbol: string;
  exchange: string;
  totalUnits: number;
  avgBuyPrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  unrealisedPnL: number;
  unrealisedPnLPercent: number;
}

export interface PortfolioSummaryReportData {
  totalInvestment: number;
  totalCurrentValue: number;
  totalUnrealisedPnL: number;
  totalUnrealisedPnLPercent: number;
  totalHoldings: number;
}
