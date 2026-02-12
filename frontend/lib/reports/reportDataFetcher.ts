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

  // categoryMap now stores the full Category object for sub-category resolution
  const categoryObjMap = new Map(categories.map(c => [c.id, c]));

  // Helper to get formatted category name (Parent: Child)
  const getCategoryName = (categoryId?: string, subCategoryId?: string) => {
    if (!categoryId) return 'Uncategorized';
    const cat = categoryObjMap.get(categoryId);
    if (!cat) return 'Unknown';
    
    if (subCategoryId && cat.subCategories) {
        const sub = cat.subCategories.find(s => s.id === subCategoryId);
        if (sub) return `${cat.name}: ${sub.name}`;
    }
    return cat.name;
  };

  const startDate = new Date(filters.startDate);
  const endDate = new Date(filters.endDate);
  // Set end date to end of day to include all transactions for that day
  endDate.setHours(23, 59, 59, 999);

  switch (type) {
    case 'EXPENSE':
    case 'INCOME':
    case 'INVESTMENT':
    case 'DEBT': {
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
      
      // Calculate Category Breakdown & Prepare Rows (Flattening Splits)
      const categoryBreakdown: Record<string, number> = {};
      const flattenedRows: any[] = [];

      filtered.forEach(t => {
          // A. Handle Rows & Breakdown
          if (t.isSplit && t.splits && t.splits.length > 0) {
              t.splits.forEach(split => {
                  const catName = getCategoryName(split.categoryId, undefined); // Splits don't have subCategoryId yet in interface
                  categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + split.amount;
                  
                  flattenedRows.push([
                      format(new Date(t.date), 'PP'),
                      `${t.description || ''} (Split)`,
                      catName,
                      accountMap.get(t.accountId) || 'Unknown',
                      split.amount
                  ]);
              });
          } else {
              const catName = getCategoryName(t.categoryId, t.subCategoryId);
              categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + t.amount;

              flattenedRows.push([
                  format(new Date(t.date), 'PP'),
                  t.description || '',
                  catName,
                  accountMap.get(t.accountId) || 'Unknown',
                  t.amount
              ]);
          }
      });

      const getTitle = () => {
          if (type === 'EXPENSE') return 'Expense Report';
          if (type === 'INCOME') return 'Income Report';
          if (type === 'INVESTMENT') return 'Investment Report';
          if (type === 'DEBT') return 'Debt Transaction Report';
          return 'Report';
      };

      return {
        title: getTitle(),
        subtitle: `${format(startDate, 'PP')} - ${format(endDate, 'PP')}`,
        generatedAt,
        headers: ['Date', 'Description', 'Category', 'Account', 'Amount'],
        rows: flattenedRows,
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
          expense: 0,
          investment: 0,
          debt: 0
        };
      });

      transactions.forEach(t => {
        const monthIndex = new Date(t.date).getMonth();
        if (t.type === 'INCOME') months[monthIndex].income += t.amount;
        else if (t.type === 'EXPENSE') months[monthIndex].expense += t.amount;
        else if (t.type === 'INVESTMENT') months[monthIndex].investment += t.amount;
        else if (t.type === 'DEBT') months[monthIndex].debt += t.amount;
      });

      const totalIncome = months.reduce((acc, m) => acc + m.income, 0);
      const totalExpense = months.reduce((acc, m) => acc + m.expense, 0);
      const totalInvestment = months.reduce((acc, m) => acc + m.investment, 0);
      const totalDebt = months.reduce((acc, m) => acc + m.debt, 0);

      // Net Savings = Income - Expenses (Investment/Debt are usually considered allocation of savings or liability payments)
      // If we consider Investment as savings, then Net 'Cash' Flow = Income - Expense - Investment - Debt
      // But usually Net Savings = Income - Expense. Investment is where savings go.
      // Let's display columns: Month, Income, Expense, Invest/Debt, Net Flow
      
      return {
        title: `Yearly Summary - ${year}`,
        generatedAt,
        headers: ['Month', 'Income', 'Expense', 'Invest', 'Debt', 'Net Flow'],
        rows: months.map(m => [
          m.name,
          m.income,
          m.expense,
          m.investment,
          m.debt,
          m.income - m.expense - m.investment - m.debt
        ]),
        summary: {
          'Total Income': totalIncome,
          'Total Expense': totalExpense,
          'Total Investment': totalInvestment,
          'Total Debt Payment': totalDebt,
          'Net Cash Flow': totalIncome - totalExpense - totalInvestment - totalDebt
        }
      };
    }

    case 'CONSOLIDATED': {
      const today = new Date();
      const allTxFromStart = await transactionService.getByDateRange(householdId, startDate, today);
      
      const txInPeriod = allTxFromStart.filter(t => new Date(t.date) <= endDate);
      const txAfterPeriod = allTxFromStart.filter(t => new Date(t.date) > endDate);

      const activeAccounts = await accountService.getAllActive(householdId);
      const activeCards = await creditCardService.getAllActive(householdId);

      const consolidatedSummary = [];
      
      let totalIncomePeriod = 0;
      let totalExpensePeriod = 0;
      let totalInvestmentPeriod = 0;
      let totalDebtPeriod = 0;

      // 1. Process Bank Accounts (Assets)
      for (const acc of activeAccounts) {
        // Calculate Closing Balance at EndDate
        const accTxAfter = txAfterPeriod.filter(t => t.accountId === acc.id);
        
        let closingBal = acc.balance || 0;
        accTxAfter.forEach(t => {
            if (t.type === 'INCOME') closingBal -= t.amount;
            else closingBal += t.amount; // EXPENSE, INVESTMENT, DEBT all reduce balance, so adding back
        });

        // Calculate Opening Balance at StartDate
        const accTxInPeriod = txInPeriod.filter(t => t.accountId === acc.id);
        
        // Calculate Flows
        let income = 0;
        let expense = 0;
        let investment = 0;
        let debt = 0;
        
        accTxInPeriod.forEach(t => {
            if (t.type === 'INCOME') income += t.amount;
            else if (t.type === 'EXPENSE') expense += t.amount;
            else if (t.type === 'INVESTMENT') investment += t.amount;
            else if (t.type === 'DEBT') debt += t.amount;
        });

        const outflows = expense + investment + debt;
        const openingBal = closingBal - income + outflows;

        totalIncomePeriod += income;
        totalExpensePeriod += expense;
        totalInvestmentPeriod += investment;
        totalDebtPeriod += debt;

        consolidatedSummary.push({
            accountId: acc.id,
            accountName: acc.name,
            openingBalance: openingBal,
            income,
            expense: outflows,
            closingBalance: closingBal,
            type: 'Asset'
        });
      }

      // 2. Process Credit Cards (Liabilities)
      for (const card of activeCards) {
          // Current Outstanding is Debt (Positive Value)
          // Expense increases Debt. Income (Payment) decreases Debt.
          
          const cardTxAfter = txAfterPeriod.filter(t => t.accountId === card.id);
          
          let closingOutstanding = card.currentOutstanding || 0;
          
          // Reverse from Today to EndDate
          cardTxAfter.forEach(t => {
              if (t.type === 'INCOME') closingOutstanding += t.amount; // Payment reduced debt, so add back to go back in time
              else closingOutstanding -= t.amount; // Expense increased debt, so subtract to go back
          });

          // Reverse from EndDate to StartDate (to get Opening)
          const cardTxInPeriod = txInPeriod.filter(t => t.accountId === card.id);
          
          let payments = 0;
          let strategies = 0; // Expenses on card
          
          cardTxInPeriod.forEach(t => {
              if (t.type === 'INCOME') payments += t.amount;
              else strategies += t.amount; // Expense
          });
          
          // Logic: Opening + Expense - Payment = Closing
          // So: Opening = Closing - Expense + Payment
          const openingOutstanding = closingOutstanding - strategies + payments;
          
          // For consolidated summary, we might want to show "Spending" as Expense and "Payments" as Income equivalent?
           // However, CC spending is not "Expense" in the same way if we sum it up with Bank expense (double counting if we pay CC from Bank).
           // But usually `CONSOLIDATED` is about "Where did money go?".
           // If I spend on CC, it IS an expense.
           // If I pay CC from Bank, it is a Transfer (or Debt payment).
           // If transaction type is DEBT/TRANSFER, we handle it.
           // `transactionService` marks CC payments from Bank as TRANSFER or DEBT usually?
           // If I pay CC, it's usually a Transfer or specific type.
           
           // For this summary, let's just list the Card flows.
           // We won't add them to `totalExpensePeriod` to avoid double counting if the user also tracks the payment from bank?
           // Actually, if `strategies` (Expenses on CC) are "Groceries", they ARE expenses.
           // The "Payment" from Bank is just a Transfer.
           // So `strategies` SHOULD be added to `totalExpensePeriod` IF they are typed as EXPENSE.
           // And `payments` (INCOME on CC) is usually a transfer from Bank.
           
           // We should probably rely on the Transaction Type aggregation we did above (which iterated ALL transactions in period).
           // Wait, I iterated `txInPeriod` separately inside the Account loop above. 
           // `totalIncomePeriod` etc are sums of transactions *linked to Bank Accounts*.
           // Transactions linked to Credit Cards were NOT included in `total**Period` above.
           // So I SHOULD add them here if I want a Total Consolidated View.
           
           let cardExpense = 0;
           let cardRefusals = 0; // Income on card (Refunds?) or Payments?
           
           cardTxInPeriod.forEach(t => {
               if (t.type === 'EXPENSE') {
                   cardExpense += t.amount;
                   totalExpensePeriod += t.amount; 
               }
               // Note: Payment to CC is usually type TRANSFER or INCOME (on CC side). 
               // If it's INCOME on CC, it's a credit.
           });
           
           consolidatedSummary.push({
               accountId: card.id,
               accountName: `${card.name} (CC)`,
               openingBalance: -openingOutstanding, // Represent liability as negative for consistency? Or just label it.
               income: payments,
               expense: strategies,
               closingBalance: -closingOutstanding,
               type: 'Liability'
           });
      }

      // Prepare Category Breakdown & Rows for the period (Flattening Splits)
      const categoryBreakdown: Record<string, number> = {};
      const flattenedRows: any[] = [];

      txInPeriod.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(t => {
        // 1. Breakdown Logic (Expense only typically)
        if (t.type === 'EXPENSE') {
             if (t.isSplit && t.splits && t.splits.length > 0) {
                 t.splits.forEach(split => {
                     const catName = getCategoryName(split.categoryId, undefined);
                     
                     // Check Category Type - Exclude DEBT/INVESTMENT from Expense Breakdown
                     const cat = categoryObjMap.get(split.categoryId || '');
                     const isExcluded = cat && (cat.type === 'DEBT' || cat.type === 'INVESTMENT');
                     
                     if (!isExcluded) {
                        categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + split.amount;
                     }
                 });
             } else {
                  const catName = getCategoryName(t.categoryId, t.subCategoryId);
                  
                  // Check Category Type - Exclude DEBT/INVESTMENT from Expense Breakdown
                  const cat = categoryObjMap.get(t.categoryId || '');
                  const isExcluded = cat && (cat.type === 'DEBT' || cat.type === 'INVESTMENT');

                  if (!isExcluded) {
                      categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + t.amount;
                  }
             }
        }

        // 2. Rows Logic
        if (t.isSplit && t.splits && t.splits.length > 0) {
            t.splits.forEach(split => {
                const catName = getCategoryName(split.categoryId, undefined);
                flattenedRows.push([
                    format(new Date(t.date), 'dd/MM/yyyy'),
                    accountMap.get(t.accountId) || 'Unknown',
                    catName,
                    `${t.description || ''} (Split)`,
                    t.type,
                    split.amount
                ]);
            });
        } else {
            const catName = getCategoryName(t.categoryId, t.subCategoryId);
            flattenedRows.push([
                format(new Date(t.date), 'dd/MM/yyyy'),
                accountMap.get(t.accountId) || 'Unknown',
                catName,
                t.description || '',
                t.type,
                t.amount
            ]);
        }
      });

      return {
        title: 'Consolidated Financial Report',
        subtitle: `${format(startDate, 'PP')} - ${format(endDate, 'PP')}`,
        generatedAt,
        headers: ['Date', 'Account', 'Category', 'Description', 'Type', 'Amount'],
        rows: flattenedRows,
        summary: {
            'Total Income': totalIncomePeriod,
            'Total Expense': totalExpensePeriod,
            'Total Investment': totalInvestmentPeriod,
            'Total Debt': totalDebtPeriod,
            'Net Change': totalIncomePeriod - (totalExpensePeriod + totalInvestmentPeriod + totalDebtPeriod)
        },
        categoryBreakdown,
        consolidatedSummary
      };
    }

    default:
      throw new Error(`Report type ${type} not implemented`);
  }
}
