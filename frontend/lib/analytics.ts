/**
 * Analytics and Financial Calculations
 * Business logic moved from backend to frontend for local-first architecture
 */

import { transactionService, accountService } from './localdb-services';
import type { Transaction } from './db-types';

// ============================================
// ANALYTICS CALCULATIONS
// ============================================

export interface MonthlyStats {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface TrendData {
  date: string;
  income: number;
  expense: number;
}

/**
 * Calculate monthly stats for a date range
 */
export async function calculateMonthlyStats(
  householdId: string,
  startDate: Date,
  endDate: Date
): Promise<MonthlyStats[]> {
  const transactions = await transactionService.getByDateRange(
    householdId,
    startDate,
    endDate
  );

  // Group by month
  const monthlyMap = new Map<string, { income: number; expense: number }>();

  transactions.forEach((t) => {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { income: 0, expense: 0 });
    }

    const stats = monthlyMap.get(monthKey)!;
    if (t.type === 'INCOME') {
      stats.income += t.amount;
    } else {
      stats.expense += t.amount;
    }
  });

  // Convert to array
  return Array.from(monthlyMap.entries()).map(([month, stats]) => ({
    month,
    income: stats.income,
    expense: stats.expense,
    net: stats.income - stats.expense,
  })).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Calculate category breakdown for expenses
 */
export async function calculateCategoryBreakdown(
  householdId: string,
  startDate: Date,
  endDate: Date,
  type: 'INCOME' | 'EXPENSE' = 'EXPENSE'
): Promise<CategoryBreakdown[]> {
  const transactions = await transactionService.getByDateRange(
    householdId,
    startDate,
    endDate
  );

  const filtered = transactions.filter((t) => t.type === type);
  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const categoryMap = new Map<string, { amount: number; count: number; name: string }>();

  filtered.forEach((t) => {
    const categoryId = t.categoryId || 'uncategorized';
    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, { amount: 0, count: 0, name: '' });
    }
    const cat = categoryMap.get(categoryId)!;
    cat.amount += t.amount;
    cat.count += 1;
  });

  // Convert to array
  return Array.from(categoryMap.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name || 'Unknown',
      amount: data.amount,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate daily/weekly trends
 */
export async function calculateTrends(
  householdId: string,
  startDate: Date,
  endDate: Date,
  granularity: 'daily' | 'weekly' = 'daily'
): Promise<TrendData[]> {
  const transactions = await transactionService.getByDateRange(
    householdId,
    startDate,
    endDate
  );

  // Group by date
  const trendMap = new Map<string, { income: number; expense: number }>();

  transactions.forEach((t) => {
    let dateKey: string;
    const date = new Date(t.date);
    
    if (granularity === 'daily') {
      dateKey = date.toISOString().split('T')[0];
    } else {
      // Weekly: start of week
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day;
      const weekStart = new Date(d.setDate(diff));
      dateKey = weekStart.toISOString().split('T')[0];
    }

    if (!trendMap.has(dateKey)) {
      trendMap.set(dateKey, { income: 0, expense: 0 });
    }

    const trend = trendMap.get(dateKey)!;
    if (t.type === 'INCOME') {
      trend.income += t.amount;
    } else {
      trend.expense += t.amount;
    }
  });

  // Convert to array and sort
  return Array.from(trendMap.entries())
    .map(([date, data]) => ({
      date,
      income: data.income,
      expense: data.expense,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate savings rate
 */
export async function calculateSavingsRate(
  householdId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const income = await transactionService.getTotalIncome(householdId, startDate, endDate);
  const expense = await transactionService.getTotalExpense(householdId, startDate, endDate);
  
  if (income === 0) return 0;
  return ((income - expense) / income) * 100;
}

/**
 * Get top spending categories
 */
export async function getTopSpendingCategories(
  householdId: string,
  startDate: Date,
  endDate: Date,
  limit: number = 5
): Promise<CategoryBreakdown[]> {
  const breakdown = await calculateCategoryBreakdown(householdId, startDate, endDate, 'EXPENSE');
  return breakdown.slice(0, limit);
}

/**
 * Calculate net worth (sum of all account balances)
 */
export async function calculateNetWorth(householdId: string): Promise<number> {
  return accountService.calculateTotalBalance(householdId);
}

/**
 * Get cash flow summary
 */
export interface CashFlowSummary {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  savingsRate: number;
  averageDailyIncome: number;
  averageDailyExpense: number;
}

export async function getCashFlowSummary(
  householdId: string,
  startDate: Date,
  endDate: Date
): Promise<CashFlowSummary> {
  const income = await transactionService.getTotalIncome(householdId, startDate, endDate);
  const expense = await transactionService.getTotalExpense(householdId, startDate, endDate);
  const savingsRate = await calculateSavingsRate(householdId, startDate, endDate);
  
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    totalIncome: income,
    totalExpense: expense,
    netCashFlow: income - expense,
    savingsRate,
    averageDailyIncome: days > 0 ? income / days : 0,
    averageDailyExpense: days > 0 ? expense / days : 0,
  };
}

// ============================================
// FINANCIAL CALCULATIONS
// ============================================

/**
 * Calculate EMI (Equated Monthly Installment)
 */
export function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): number {
  const monthlyRate = annualInterestRate / 12 / 100;
  
  if (monthlyRate === 0) {
    return principal / tenureMonths;
  }
  
  const emi = 
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  
  return Math.round(emi * 100) / 100;
}

/**
 * Calculate loan amortization schedule
 */
export interface AmortizationEntry {
  month: number;
  emiAmount: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

export function calculateAmortizationSchedule(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): AmortizationEntry[] {
  const emi = calculateEMI(principal, annualInterestRate, tenureMonths);
  const monthlyRate = annualInterestRate / 12 / 100;
  
  const schedule: AmortizationEntry[] = [];
  let remainingBalance = principal;
  
  for (let month = 1; month <= tenureMonths; month++) {
    const interestPaid = remainingBalance * monthlyRate;
    const principalPaid = emi - interestPaid;
    remainingBalance -= principalPaid;
    
    schedule.push({
      month,
      emiAmount: emi,
      principalPaid: Math.round(principalPaid * 100) / 100,
      interestPaid: Math.round(interestPaid * 100) / 100,
      remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100),
    });
  }
  
  return schedule;
}

/**
 * Calculate credit card interest
 */
export function calculateCreditCardInterest(
  outstandingAmount: number,
  annualInterestRate: number,
  days: number = 30
): number {
  const dailyRate = annualInterestRate / 365 / 100;
  return outstandingAmount * dailyRate * days;
}

/**
 * Calculate compound interest
 */
export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  years: number,
  compoundingFrequency: number = 12
): number {
  const rate = annualRate / 100;
  const amount = principal * Math.pow(
    1 + rate / compoundingFrequency,
    compoundingFrequency * years
  );
  return Math.round(amount * 100) / 100;
}

/**
 * Calculate budget utilization percentage
 */
export function calculateBudgetUtilization(spent: number, budgeted: number): number {
  if (budgeted === 0) return 0;
  return (spent / budgeted) * 100;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
