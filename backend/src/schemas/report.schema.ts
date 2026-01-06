export type ReportType = 
  | 'EXPENSE' 
  | 'INCOME' 
  | 'ACCOUNT_SUMMARY' 
  | 'LOAN' 
  | 'CREDIT_CARD' 
  | 'BUDGET_VS_ACTUAL' 
  | 'TRIP_EVENT' 
  | 'YEARLY_SUMMARY';

export type ReportFormat = 'EXCEL' | 'PDF';

export interface ReportFilters {
  startDate: string; // ISO date
  endDate: string;   // ISO date
  accountIds?: string[];
  categoryIds?: string[];
  tags?: string[]; // For trip/event reports
}

export interface ReportRequest {
  type: ReportType;
  format: ReportFormat;
  filters: ReportFilters;
}

// Report Data Structures
export interface TransactionReportItem {
  date: Date;
  description: string;
  category: string;
  account: string;
  amount: number;
  type: string;
  tags?: string;
}

export interface CategoryBreakdown {
  categoryName: string;
  amount: number;
  count: number;
  percentage: number;
  color?: string;
}

export interface AccountBreakdown {
  accountName: string;
  income: number;
  expense: number;
  balance: number;
}

export interface LoanReportItem {
  emiNumber: number;
  dueDate: Date;
  principalComponent: number;
  interestComponent: number;
  totalAmount: number;
  status: string;
  paidDate?: Date;
}

export interface CreditCardReportItem {
  statementDate: Date;
  cycleStart: Date;
  cycleEnd: Date;
  totalSpends: number;
  totalPayments: number;
  closingBalance: number;
  minimumDue: number;
  dueDate: Date;
  status: string;
}

export interface BudgetVsActualItem {
  categoryName: string;
  budgeted: number;
  actual: number;
  difference: number;
  percentageUsed: number;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  income: number;
  expense: number;
  netSavings: number;
}

export interface ReportData {
  // Metadata
  reportType: ReportType;
  dateRange: {
    start: string;
    end: string;
  };
  generatedAt: Date;
  householdName: string;
  
  // Summary metrics
  summary: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    transactionCount: number;
  };
  
  // Detailed data (different per report type)
  transactions?: TransactionReportItem[];
  categoryBreakdown?: CategoryBreakdown[];
  accountBreakdown?: AccountBreakdown[];
  loanSchedule?: {
    loanName: string;
    lender?: string;
    principal: number;
    interestRate: number;
    outstandingPrincipal: number;
    emis: LoanReportItem[];
  };
  creditCardStatements?: {
    cardName: string;
    issuer?: string;
    creditLimit: number;
    outstandingAmount: number;
    statements: CreditCardReportItem[];
  };
  budgetComparison?: BudgetVsActualItem[];
  monthlyTrends?: MonthlyTrend[];
}
