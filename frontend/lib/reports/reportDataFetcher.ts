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
  if (!household) throw new Error('Household not found');
  const householdId = household.id;
  const generatedAt = new Date().toISOString();

  // Common data
  const accounts = await accountService.getAll(householdId);
  const creditCards = await creditCardService.getAll(householdId);
  const categories = await categoryService.getAll(householdId);
  
  const accountMap = new Map();
  accounts.forEach(a => accountMap.set(a.id, a.name));
  creditCards.forEach(c => accountMap.set(c.id, c.name));

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const startDate = new Date(filters.startDate);
  const endDate = new Date(filters.endDate);
  // Set end date to end of day to include all transactions for that day
  endDate.setHours(23, 59, 59, 999);

  switch (type) {
    case 'EXPENSE':
    case 'INCOME': {
      const transactions = await transactionService.getByDateRange(householdId, startDate, endDate);
      const filtered = transactions.filter(t => {
        const matchesType = t.type === type;
        const matchesAccount = filters.accountIds?.length 
          ? filters.accountIds.includes(t.accountId)
          : true;
        const matchesCategory = filters.categoryIds?.length
          ? filters.categoryIds.includes(t.categoryId || '')
          : true;
        
        return matchesType && matchesAccount && matchesCategory;
      });
      
      const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);
      
      // Calculate Category Breakdown
      const categoryBreakdown: Record<string, number> = {};
      filtered.forEach(t => {
          const catName = categoryMap.get(t.categoryId || '') || 'Uncategorized';
          categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + t.amount;
      });

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
        },
        categoryBreakdown
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
      const totalPrincipal = activeLoans.reduce((sum, l) => sum + l.principal, 0);
      const totalRemaining = activeLoans.reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);

      return {
        title: 'Loan Liability Report',
        generatedAt,
        headers: ['Loan Name', 'Lender', 'Principal', 'Interest Rate', 'EMI', 'Remaining Balance'],
        rows: activeLoans.map(l => [
          l.name,
          l.lender || '-',
          l.principal,
          `${l.interestRate}%`,
          l.emiAmount || 0,
          l.outstandingPrincipal || 0
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
        new Date(year, 11, 31, 23, 59, 59, 999)
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

    case 'CONSOLIDATED': {
      // 1. Get ALL transactions from Start Date to NOW (to calculate closing balance at End Date)
      // Actually, strategy:
      // Current Balance is known.
      // Balance at EndDate = CurrentBalance - (Transactions > EndDate)
      // Balance at StartDate = Balance at EndDate - (Transactions between Start & End)
      
      const today = new Date();
      // Ensure we have transactions up to today to reverse-calculate
      // However, simplified approach:
      // Fetch transactions relative to the REPORT PERIOD
      // But to get accurate Opening Balance, we need an anchor.
      // Anchor = Current Balance (from accounts DB)
      
      // Fetch all transactions from Report Start Date to NOW
      const allTxFromStart = await transactionService.getByDateRange(householdId, startDate, today);
      
      // Filter primarily by account if needed
      // Note: credit cards are liabilities, accounts are assets.
      // Ideally handled separately or unified. For now, focus on Accounts (Bank/Cash).
      
      const txInPeriod = allTxFromStart.filter(t => new Date(t.date) <= endDate);
      const txAfterPeriod = allTxFromStart.filter(t => new Date(t.date) > endDate);

      const activeAccounts = await accountService.getAllActive(householdId);
      const consolidatedSummary = [];
      
      let totalIncomePeriod = 0;
      let totalExpensePeriod = 0;

      for (const acc of activeAccounts) {
        // 1. Calculate Closing Balance at EndDate
        // Current Balance (DB) - (Sum of Income after EndDate) + (Sum of Expense after EndDate)
        // Income adds to balance, Expense subtracts. So to reverse:
        // Reverse Income = -Amount
        // Reverse Expense = +Amount
        
        const accTxAfter = txAfterPeriod.filter(t => t.accountId === acc.id);
        
        let closingBal = acc.balance || 0;
        accTxAfter.forEach(t => {
            if (t.type === 'INCOME') closingBal -= t.amount;
            else if (t.type === 'EXPENSE') closingBal += t.amount;
        });

        // 2. Calculate Opening Balance at StartDate
        // Closing Balance - (Sum of Income in Period) + (Sum of Expense in Period)
        const accTxInPeriod = txInPeriod.filter(t => t.accountId === acc.id);
        
        let income = 0;
        let expense = 0;
        
        accTxInPeriod.forEach(t => {
            if (t.type === 'INCOME') income += t.amount;
            else if (t.type === 'EXPENSE') expense += t.amount;
        });

        const openingBal = closingBal - income + expense;

        totalIncomePeriod += income;
        totalExpensePeriod += expense;

        consolidatedSummary.push({
            accountId: acc.id,
            accountName: acc.name,
            openingBalance: openingBal,
            income,
            expense,
            closingBalance: closingBal
        });
      }

      // Prepare Category Breakdown for the period
      const categoryBreakdown: Record<string, number> = {};
      txInPeriod.forEach(t => {
        if (t.type === 'EXPENSE') {
            const catName = categoryMap.get(t.categoryId || '') || 'Uncategorized';
            categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + t.amount;
        }
      });

      return {
        title: 'Consolidated Financial Report',
        subtitle: `${format(startDate, 'PP')} - ${format(endDate, 'PP')}`,
        generatedAt,
        headers: ['Date', 'Account', 'Category', 'Description', 'Type', 'Amount'],
        rows: txInPeriod.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => [
            format(new Date(t.date), 'dd/MM/yyyy'),
            accountMap.get(t.accountId) || 'Unknown',
            categoryMap.get(t.categoryId || '') || '-',
            t.description || '',
            t.type,
            t.amount
        ]),
        summary: {
            'Total Income': totalIncomePeriod,
            'Total Expense': totalExpensePeriod,
            'Net Change': totalIncomePeriod - totalExpensePeriod
        },
        categoryBreakdown,
        consolidatedSummary
      };
    }

    default:
      throw new Error(`Report type ${type} not implemented`);
  }
}
