import prisma from '../lib/prisma';
import { 
  ReportType, 
  ReportFilters, 
  ReportData,
  TransactionReportItem,
  CategoryBreakdown,
  AccountBreakdown,
  LoanReportItem,
  CreditCardReportItem,
  BudgetVsActualItem,
  MonthlyTrend
} from '../schemas/report.schema';
import { startOfMonth, endOfMonth, getYear, getMonth, eachMonthOfInterval } from 'date-fns';

/**
 * Generates report data based on type and filters
 */
export async function generateReportData(
  householdId: string,
  reportType: ReportType,
  filters: ReportFilters
): Promise<ReportData> {
  const startDate = new Date(filters.startDate);
  const endDate = new Date(filters.endDate);
  
  // Get household name
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { name: true }
  });

  const baseData: ReportData = {
    reportType,
    dateRange: {
      start: filters.startDate,
      end: filters.endDate
    },
    generatedAt: new Date(),
    householdName: household?.name || 'My Household',
    summary: {
      totalIncome: 0,
      totalExpense: 0,
      netSavings: 0,
      transactionCount: 0
    }
  };

  switch (reportType) {
    case 'EXPENSE':
      return await generateExpenseReport(householdId, filters, baseData);
    
    case 'INCOME':
      return await generateIncomeReport(householdId, filters, baseData);
    
    case 'ACCOUNT_SUMMARY':
      return await generateAccountSummaryReport(householdId, filters, baseData);
    
    case 'LOAN':
      return await generateLoanReport(householdId, filters, baseData);
    
    case 'CREDIT_CARD':
      return await generateCreditCardReport(householdId, filters, baseData);
    
    case 'BUDGET_VS_ACTUAL':
      return await generateBudgetVsActualReport(householdId, filters, baseData);
    
    case 'TRIP_EVENT':
      return await generateTripEventReport(householdId, filters, baseData);
    
    case 'YEARLY_SUMMARY':
      return await generateYearlySummaryReport(householdId, filters, baseData);
    
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
}

/**
 * Expense Report: All expense transactions grouped by category
 */
async function generateExpenseReport(
  householdId: string,
  filters: ReportFilters,
  baseData: ReportData
): Promise<ReportData> {
  const where: any = {
    account: { householdId },
    type: 'EXPENSE',
    date: {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate)
    }
  };

  if (filters.accountIds && filters.accountIds.length > 0) {
    where.accountId = { in: filters.accountIds };
  }

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    where.categoryId = { in: filters.categoryIds };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: true,
      account: true
    },
    orderBy: { date: 'desc' }
  });

  // Map transactions
  const transactionItems: TransactionReportItem[] = transactions.map(t => ({
    date: t.date,
    description: t.description || 'No description',
    category: t.category?.name || 'Uncategorized',
    account: t.account.name,
    amount: Math.abs(Number(t.amount)),
    type: t.type,
    tags: t.tags || undefined
  }));

  // Category breakdown
  const categoryMap = new Map<string, { amount: number; count: number; color?: string }>();
  
  transactions.forEach(t => {
    const catName = t.category?.name || 'Uncategorized';
    const existing = categoryMap.get(catName) || { amount: 0, count: 0, color: t.category?.color || undefined };
    existing.amount += Math.abs(Number(t.amount));
    existing.count += 1;
    categoryMap.set(catName, existing);
  });

  const totalExpense = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);

  const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      categoryName: name,
      amount: data.amount,
      count: data.count,
      percentage: totalExpense > 0 ? Math.round((data.amount / totalExpense) * 100) : 0,
      color: data.color
    }))
    .sort((a, b) => b.amount - a.amount);

  baseData.summary.totalExpense = totalExpense;
  baseData.summary.transactionCount = transactions.length;
  baseData.transactions = transactionItems;
  baseData.categoryBreakdown = categoryBreakdown;

  return baseData;
}

/**
 * Income Report: All income transactions grouped by category
 */
async function generateIncomeReport(
  householdId: string,
  filters: ReportFilters,
  baseData: ReportData
): Promise<ReportData> {
  const where: any = {
    account: { householdId },
    type: 'INCOME',
    date: {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate)
    }
  };

  if (filters.accountIds && filters.accountIds.length > 0) {
    where.accountId = { in: filters.accountIds };
  }

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    where.categoryId = { in: filters.categoryIds };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: true,
      account: true
    },
    orderBy: { date: 'desc' }
  });

  const transactionItems: TransactionReportItem[] = transactions.map(t => ({
    date: t.date,
    description: t.description || 'No description',
    category: t.category?.name || 'Uncategorized',
    account: t.account.name,
    amount: Number(t.amount),
    type: t.type,
    tags: t.tags || undefined
  }));

  // Category breakdown
  const categoryMap = new Map<string, { amount: number; count: number; color?: string }>();
  
  transactions.forEach(t => {
    const catName = t.category?.name || 'Uncategorized';
    const existing = categoryMap.get(catName) || { amount: 0, count: 0, color: t.category?.color || undefined };
    existing.amount += Number(t.amount);
    existing.count += 1;
    categoryMap.set(catName, existing);
  });

  const totalIncome = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);

  const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      categoryName: name,
      amount: data.amount,
      count: data.count,
      percentage: totalIncome > 0 ? Math.round((data.amount / totalIncome) * 100) : 0,
      color: data.color
    }))
    .sort((a, b) => b.amount - a.amount);

  baseData.summary.totalIncome = totalIncome;
  baseData.summary.transactionCount = transactions.length;
  baseData.transactions = transactionItems;
  baseData.categoryBreakdown = categoryBreakdown;

  return baseData;
}

/**
 * Account Summary Report: Balance and activity for each account
 */
async function generateAccountSummaryReport(
  householdId: string,
  filters: ReportFilters,
  baseData: ReportData
): Promise<ReportData> {
  const accountWhere: any = { householdId, isArchived: false };
  
  if (filters.accountIds && filters.accountIds.length > 0) {
    accountWhere.id = { in: filters.accountIds };
  }

  const accounts = await prisma.account.findMany({
    where: accountWhere,
    include: {
      transactions: {
        where: {
          date: {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate)
          }
        }
      }
    }
  });

  const accountBreakdown: AccountBreakdown[] = accounts.map(account => {
    const income = account.transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expense = account.transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    return {
      accountName: account.name,
      income,
      expense,
      balance: Number(account.balance)
    };
  });

  baseData.summary.totalIncome = accountBreakdown.reduce((sum, a) => sum + a.income, 0);
  baseData.summary.totalExpense = accountBreakdown.reduce((sum, a) => sum + a.expense, 0);
  baseData.summary.netSavings = baseData.summary.totalIncome - baseData.summary.totalExpense;
  baseData.accountBreakdown = accountBreakdown;

  return baseData;
}

/**
 * Loan Report: EMI schedule and payment history
 */
async function generateLoanReport(
  householdId: string,
  filters: ReportFilters,
  baseData: ReportData
): Promise<ReportData> {
  const loans = await prisma.loan.findMany({
    where: { 
      householdId,
      status: 'ACTIVE'
    },
    include: {
      emis: {
        where: {
          dueDate: {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate)
          }
        },
        orderBy: { emiNumber: 'asc' }
      }
    }
  });

  if (loans.length === 0) {
    return baseData;
  }

  // For simplicity, generate report for first loan (or combine all)
  const loan = loans[0];
  
  const emiSchedule: LoanReportItem[] = loan.emis.map(emi => ({
    emiNumber: emi.emiNumber,
    dueDate: emi.dueDate,
    principalComponent: Number(emi.principalComponent),
    interestComponent: Number(emi.interestComponent),
    totalAmount: Number(emi.totalAmount),
    status: emi.status,
    paidDate: emi.paidDate || undefined
  }));

  baseData.loanSchedule = {
    loanName: loan.name,
    lender: loan.lender || undefined,
    principal: Number(loan.principal),
    interestRate: Number(loan.interestRate),
    outstandingPrincipal: Number(loan.outstandingPrincipal),
    emis: emiSchedule
  };

  const totalPaid = emiSchedule
    .filter(e => e.status === 'PAID')
    .reduce((sum, e) => sum + e.totalAmount, 0);
  
  baseData.summary.totalExpense = totalPaid;
  baseData.summary.transactionCount = emiSchedule.filter(e => e.status === 'PAID').length;

  return baseData;
}

/**
 * Credit Card Report: Statement history
 */
async function generateCreditCardReport(
  householdId: string,
  filters: ReportFilters,
  baseData: ReportData
): Promise<ReportData> {
  const creditCards = await prisma.creditCard.findMany({
    where: {
      account: { householdId }
    },
    include: {
      account: true,
      statements: {
        where: {
          statementDate: {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate)
          }
        },
        orderBy: { statementDate: 'desc' }
      }
    }
  });

  if (creditCards.length === 0) {
    return baseData;
  }

  const card = creditCards[0];
  
  const statements: CreditCardReportItem[] = card.statements.map(stmt => ({
    statementDate: stmt.statementDate,
    cycleStart: stmt.cycleStart,
    cycleEnd: stmt.cycleEnd,
    totalSpends: Number(stmt.totalSpends),
    totalPayments: Number(stmt.totalPayments),
    closingBalance: Number(stmt.closingBalance),
    minimumDue: Number(stmt.minimumDue),
    dueDate: stmt.dueDate,
    status: stmt.status
  }));

  baseData.creditCardStatements = {
    cardName: card.account.name,
    issuer: card.issuer || undefined,
    creditLimit: Number(card.creditLimit),
    outstandingAmount: Number(card.outstandingAmount),
    statements
  };

  const totalSpent = statements.reduce((sum, s) => sum + s.totalSpends, 0);
  baseData.summary.totalExpense = totalSpent;
  baseData.summary.transactionCount = statements.length;

  return baseData;
}

/**
 * Budget vs Actual Report: Compare budgeted amounts with actual spending
 */
async function generateBudgetVsActualReport(
  householdId: string,
  filters: ReportFilters,
  baseData: ReportData
): Promise<ReportData> {
  const budgets = await prisma.budget.findMany({
    where: {
      householdId,
      isActive: true,
      type: 'RECURRING'
    },
    include: {
      category: true,
      transactions: {
        where: {
          date: {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate)
          }
        }
      }
    }
  });

  const budgetComparison: BudgetVsActualItem[] = budgets.map(budget => {
    const actual = budget.transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    const budgeted = Number(budget.amount);
    const difference = budgeted - actual;
    const percentageUsed = budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0;

    return {
      categoryName: budget.category?.name || budget.name,
      budgeted,
      actual,
      difference,
      percentageUsed
    };
  });

  baseData.budgetComparison = budgetComparison;
  baseData.summary.totalExpense = budgetComparison.reduce((sum, b) => sum + b.actual, 0);

  return baseData;
}

/**
 * Trip/Event Report: Tag-based expense grouping
 */
async function generateTripEventReport(
  householdId: string,
  filters: ReportFilters,
  baseData: ReportData
): Promise<ReportData> {
  const where: any = {
    account: { householdId },
    date: {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate)
    }
  };

  // Filter by tags if provided
  if (filters.tags && filters.tags.length > 0) {
    // Tags are stored as comma-separated or JSON string
    // For simplicity, using contains for each tag
    where.OR = filters.tags.map(tag => ({
      tags: { contains: tag }
    }));
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: true,
      account: true
    },
    orderBy: { date: 'desc' }
  });

  const transactionItems: TransactionReportItem[] = transactions.map(t => ({
    date: t.date,
    description: t.description || 'No description',
    category: t.category?.name || 'Uncategorized',
    account: t.account.name,
    amount: t.type === 'EXPENSE' ? Math.abs(Number(t.amount)) : Number(t.amount),
    type: t.type,
    tags: t.tags || undefined
  }));

  const totalIncome = transactionItems
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactionItems
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  baseData.summary.totalIncome = totalIncome;
  baseData.summary.totalExpense = totalExpense;
  baseData.summary.netSavings = totalIncome - totalExpense;
  baseData.summary.transactionCount = transactions.length;
  baseData.transactions = transactionItems;

  return baseData;
}

/**
 * Yearly Summary Report: Month-by-month trends
 */
async function generateYearlySummaryReport(
  householdId: string,
  filters: ReportFilters,
  baseData: ReportData
): Promise<ReportData> {
  const startDate = new Date(filters.startDate);
  const endDate = new Date(filters.endDate);
  
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  const monthlyData = await prisma.analyticsMonthly.findMany({
    where: {
      householdId,
      OR: months.map(date => ({
        year: getYear(date),
        month: getMonth(date) + 1
      }))
    },
    orderBy: [{ year: 'asc' }, { month: 'asc' }]
  });

  const monthlyTrends: MonthlyTrend[] = monthlyData.map(m => ({
    month: `${String(m.month).padStart(2, '0')}/${m.year}`,
    year: m.year,
    income: Number(m.income),
    expense: Number(m.expense),
    netSavings: Number(m.netSavings)
  }));

  baseData.monthlyTrends = monthlyTrends;
  baseData.summary.totalIncome = monthlyTrends.reduce((sum, m) => sum + m.income, 0);
  baseData.summary.totalExpense = monthlyTrends.reduce((sum, m) => sum + m.expense, 0);
  baseData.summary.netSavings = baseData.summary.totalIncome - baseData.summary.totalExpense;

  return baseData;
}
