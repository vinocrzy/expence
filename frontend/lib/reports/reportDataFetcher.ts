import { 
  transactionService, 
  accountService, 
  categoryService, 
  loanService, 
  creditCardService, 
  budgetService, 
  householdService
} from '../localdb-services';
import { ReportFilters, ReportType, ReportData } from './types';
import { format } from 'date-fns';

export async function fetchReportData(type: ReportType, filters: ReportFilters): Promise<ReportData> {
  const household = await householdService.getCurrent();
  const householdId = household.id;
  const generatedAt = new Date().toISOString();

  // Common data
  const accounts = await accountService.getAll(householdId);
  const categories = await categoryService.getAll(householdId);
  
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const startDate = new Date(filters.startDate);
  const endDate = new Date(filters.endDate);

  switch (type) {
    case 'EXPENSE':
    case 'INCOME': {
      const transactions = await transactionService.getByDateRange(householdId, startDate, endDate);
      const filtered = transactions.filter(t => t.type === type);
      
      const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);
      
      return {
        title: `${type === 'EXPENSE' ? 'Expense' : 'Income'} Report`,
        subtitle: `${format(startDate, 'PP')} - ${format(endDate, 'PP')}`,
        generatedAt,
        headers: ['Date', 'Description', 'Category', 'Account', 'Amount'],
        rows: filtered.map(t => [
          format(new Date(t.date), 'PP'),
          t.description || '',
          categoryMap.get(t.categoryId || '') || 'Unknown',
          accountMap.get(t.accountId) || 'Unknown',
          t.amount
        ]),
        summary: {
          'Total Count': filtered.length,
          'Total Amount': totalAmount
        }
      };
    }

    case 'ACCOUNT_SUMMARY': {
      const activeAccounts = await accountService.getAllActive(householdId);
      const totalBalance = activeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      
      return {
        title: 'Account Summary Report',
        generatedAt,
        headers: ['Account Name', 'Type', 'Currency', 'Balance'],
        rows: activeAccounts.map(a => [
          a.name,
          a.type,
          a.currency,
          a.balance || 0
        ]),
        summary: {
          'Total Accounts': activeAccounts.length,
          'Total Net Worth': totalBalance
        }
      };
    }

    case 'LOAN': {
      const loans = await loanService.getAll(householdId);
      const activeLoans = loans.filter(l => !l.isArchived);
      const totalPrincipal = activeLoans.reduce((sum, l) => sum + l.principalAmount, 0);
      const totalRemaining = activeLoans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);

      return {
        title: 'Loan Liability Report',
        generatedAt,
        headers: ['Loan Name', 'Lender', 'Principal', 'Interest Rate', 'EMI', 'Remaining Balance'],
        rows: activeLoans.map(l => [
          l.name,
          l.lenderName || '-',
          l.principalAmount,
          `${l.interestRate}%`,
          l.emiAmount || 0,
          l.remainingBalance || 0
        ]),
        summary: {
          'Total Loans': activeLoans.length,
          'Total Principal Borrowed': totalPrincipal,
          'Total Outstanding': totalRemaining
        }
      };
    }

    case 'CREDIT_CARD': {
      const cards = await creditCardService.getAllActive(householdId);
      const totalLimit = cards.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
      const totalOutstanding = cards.reduce((sum, c) => sum + (c.currentOutstanding || 0), 0);

      return {
        title: 'Credit Card Status Report',
        generatedAt,
        headers: ['Card Name', 'Bank', 'Limit', 'Outstanding', 'Billing Cycle', 'Due Day'],
        rows: cards.map(c => [
          c.name,
          c.bankName || '-',
          c.creditLimit || 0,
          c.currentOutstanding || 0,
          c.billingCycle || '-',
          c.paymentDueDay || '-'
        ]),
        summary: {
          'Total Cards': cards.length,
          'Total Credit Limit': totalLimit,
          'Total Utilized': totalOutstanding,
          'Utilization Ratio': totalLimit > 0 ? `${((totalOutstanding / totalLimit) * 100).toFixed(1)}%` : '0%'
        }
      };
    }

    case 'BUDGET_VS_ACTUAL': {
      const budgets = await budgetService.getAll(householdId);
      const activeBudgets = budgets.filter(b => b.status === 'ACTIVE' && !b.isArchived);
      
      return {
        title: 'Budget vs Actual Report',
        generatedAt,
        headers: ['Budget Name', 'Period', 'Total Budget', 'Total Spent', 'Status'],
        rows: activeBudgets.map(b => [
          b.name,
          b.period || '-',
          b.totalBudget || 0,
          b.totalSpent || 0,
          b.status || 'UNKNOWN'
        ]),
        summary: {
          'Active Budgets': activeBudgets.length,
          'Total Budgeted': activeBudgets.reduce((sum, b) => sum + (b.totalBudget || 0), 0),
          'Total Spent': activeBudgets.reduce((sum, b) => sum + (b.totalSpent || 0), 0)
        }
      };
    }

    case 'TRIP_EVENT': {
      const budgets = await budgetService.getActiveEventBudgets();
      
      return {
        title: 'Trip & Event Report',
        generatedAt,
        headers: ['Event Name', 'Start Date', 'End Date', 'Budget', 'Spent'],
        rows: budgets.map(b => [
          b.name,
          b.startDate ? format(new Date(b.startDate), 'PP') : '-',
          b.endDate ? format(new Date(b.endDate), 'PP') : '-',
          b.totalBudget || 0,
          b.totalSpent || 0
        ]),
        summary: {
          'Total Events': budgets.length
        }
      };
    }

    case 'YEARLY_SUMMARY': {
      // Aggregation logic
      const year = startDate.getFullYear();
      const transactions = await transactionService.getByDateRange(
        householdId, 
        new Date(year, 0, 1), 
        new Date(year, 11, 31)
      );

      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(year, i, 1);
        return {
          name: format(d, 'MMMM'),
          income: 0,
          expense: 0
        };
      });

      transactions.forEach(t => {
        const monthIndex = new Date(t.date).getMonth();
        if (t.type === 'INCOME') months[monthIndex].income += t.amount;
        if (t.type === 'EXPENSE') months[monthIndex].expense += t.amount;
      });

      const totalIncome = months.reduce((acc, m) => acc + m.income, 0);
      const totalExpense = months.reduce((acc, m) => acc + m.expense, 0);

      return {
        title: `Yearly Summary - ${year}`,
        generatedAt,
        headers: ['Month', 'Income', 'Expense', 'Net Savings'],
        rows: months.map(m => [
          m.name,
          m.income,
          m.expense,
          m.income - m.expense
        ]),
        summary: {
          'Total Income': totalIncome,
          'Total Expense': totalExpense,
          'Net Savings': totalIncome - totalExpense
        }
      };
    }

    default:
      throw new Error(`Report type ${type} not implemented`);
  }
}
