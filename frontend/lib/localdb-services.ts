/**
 * Local Database Service Layer
 * All CRUD operations for local-first data management
 * Replaces backend API calls
 */

import { db, generateId } from './localdb';
import type {
  Account,
  Category,
  Transaction,
  CreditCard,
  CreditCardTransaction,
  Loan,
  LoanPayment,
  Budget,
  BudgetPlanItem,
  User,
  Household,
} from './localdb';

// ============================================
// ACCOUNT OPERATIONS
// ============================================

export const accountService = {
  async getAll(householdId: string): Promise<Account[]> {
    return db.accounts
      .where('householdId')
      .equals(householdId)
      .toArray();
  },

  async getAllActive(householdId: string): Promise<Account[]> {
    return db.accounts
      .where('householdId')
      .equals(householdId)
      .filter(a => !a.isArchived)
      .toArray();
  },

  async getById(id: string): Promise<Account | undefined> {
    return db.accounts.get(id);
  },

  async create(data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const account: Account = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.accounts.add(account);
    return account;
  },

  async update(id: string, data: Partial<Account>): Promise<Account> {
    const updated = { ...data, updatedAt: new Date() };
    await db.accounts.update(id, updated);
    const account = await db.accounts.get(id);
    if (!account) throw new Error('Account not found');
    return account;
  },

  async delete(id: string): Promise<void> {
    await db.accounts.delete(id);
  },

  async archive(id: string): Promise<Account> {
    return this.update(id, { isArchived: true });
  },

  async calculateTotalBalance(householdId: string): Promise<number> {
    const accounts = await this.getAllActive(householdId);
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  },
};

// ============================================
// CATEGORY OPERATIONS
// ============================================

export const categoryService = {
  async getAll(householdId: string): Promise<Category[]> {
    return db.categories
      .where('householdId')
      .equals(householdId)
      .toArray();
  },

  async getByType(householdId: string, type: string): Promise<Category[]> {
    return db.categories
      .where(['householdId', 'type'])
      .equals([householdId, type])
      .toArray();
  },

  async getById(id: string): Promise<Category | undefined> {
    return db.categories.get(id);
  },

  async create(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const category: Category = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.categories.add(category);
    return category;
  },

  async update(id: string, data: Partial<Category>): Promise<Category> {
    const updated = { ...data, updatedAt: new Date() };
    await db.categories.update(id, updated);
    const category = await db.categories.get(id);
    if (!category) throw new Error('Category not found');
    return category;
  },

  async delete(id: string): Promise<void> {
    await db.categories.delete(id);
  },
};

// ============================================
// TRANSACTION OPERATIONS
// ============================================

export const transactionService = {
  async getAll(householdId: string): Promise<Transaction[]> {
    return db.transactions
      .where('householdId')
      .equals(householdId)
      .reverse()
      .sortBy('date');
  },

  async getByDateRange(
    householdId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    const allTransactions = await db.transactions
      .where('householdId')
      .equals(householdId)
      .toArray();

    return allTransactions.filter(
      t => t.date >= startDate && t.date <= endDate
    );
  },

  async getByAccount(accountId: string): Promise<Transaction[]> {
    return db.transactions
      .where('accountId')
      .equals(accountId)
      .reverse()
      .sortBy('date');
  },

  async getByCategory(categoryId: string): Promise<Transaction[]> {
    return db.transactions
      .where('categoryId')
      .equals(categoryId)
      .reverse()
      .sortBy('date');
  },

  async getById(id: string): Promise<Transaction | undefined> {
    return db.transactions.get(id);
  },

  async create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const transaction: Transaction = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Update account balance
    const account = await db.accounts.get(data.accountId);
    if (account) {
      const newBalance = data.type === 'INCOME' 
        ? account.balance + data.amount
        : account.balance - data.amount;
      await db.accounts.update(data.accountId, { 
        balance: newBalance,
        updatedAt: new Date(),
      });
    }

    await db.transactions.add(transaction);
    return transaction;
  },

  async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
    const oldTransaction = await db.transactions.get(id);
    if (!oldTransaction) throw new Error('Transaction not found');

    // Revert old transaction effect on account
    const account = await db.accounts.get(oldTransaction.accountId);
    if (account) {
      const revertedBalance = oldTransaction.type === 'INCOME'
        ? account.balance - oldTransaction.amount
        : account.balance + oldTransaction.amount;
      
      // Apply new transaction effect
      const newAmount = data.amount ?? oldTransaction.amount;
      const newType = data.type ?? oldTransaction.type;
      const newBalance = newType === 'INCOME'
        ? revertedBalance + newAmount
        : revertedBalance - newAmount;

      await db.accounts.update(oldTransaction.accountId, {
        balance: newBalance,
        updatedAt: new Date(),
      });
    }

    const updated = { ...data, updatedAt: new Date() };
    await db.transactions.update(id, updated);
    
    const transaction = await db.transactions.get(id);
    if (!transaction) throw new Error('Transaction not found');
    return transaction;
  },

  async delete(id: string): Promise<void> {
    const transaction = await db.transactions.get(id);
    if (!transaction) throw new Error('Transaction not found');

    // Revert transaction effect on account
    const account = await db.accounts.get(transaction.accountId);
    if (account) {
      const newBalance = transaction.type === 'INCOME'
        ? account.balance - transaction.amount
        : account.balance + transaction.amount;
      await db.accounts.update(transaction.accountId, {
        balance: newBalance,
        updatedAt: new Date(),
      });
    }

    await db.transactions.delete(id);
  },

  async getTotalIncome(householdId: string, startDate: Date, endDate: Date): Promise<number> {
    const transactions = await this.getByDateRange(householdId, startDate, endDate);
    return transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
  },

  async getTotalExpense(householdId: string, startDate: Date, endDate: Date): Promise<number> {
    const transactions = await this.getByDateRange(householdId, startDate, endDate);
    return transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  },
};

// ============================================
// CREDIT CARD OPERATIONS
// ============================================

export const creditCardService = {
  async getAll(householdId: string): Promise<CreditCard[]> {
    return db.creditCards
      .where('householdId')
      .equals(householdId)
      .toArray();
  },

  async getAllActive(householdId: string): Promise<CreditCard[]> {
    return db.creditCards
      .where('householdId')
      .equals(householdId)
      .filter(cc => !cc.isArchived)
      .toArray();
  },

  async getById(id: string): Promise<CreditCard | undefined> {
    return db.creditCards.get(id);
  },

  async create(data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditCard> {
    const creditCard: CreditCard = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.creditCards.add(creditCard);
    return creditCard;
  },

  async update(id: string, data: Partial<CreditCard>): Promise<CreditCard> {
    const updated = { ...data, updatedAt: new Date() };
    await db.creditCards.update(id, updated);
    const creditCard = await db.creditCards.get(id);
    if (!creditCard) throw new Error('Credit card not found');
    return creditCard;
  },

  async delete(id: string): Promise<void> {
    await db.creditCards.delete(id);
  },

  async archive(id: string): Promise<CreditCard> {
    return this.update(id, { isArchived: true });
  },

  async calculateOutstanding(creditCardId: string): Promise<number> {
    const transactions = await db.creditCardTransactions
      .where('creditCardId')
      .equals(creditCardId)
      .filter(t => !t.isPaid)
      .toArray();
    
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  },

  async updateOutstanding(creditCardId: string): Promise<void> {
    const outstanding = await this.calculateOutstanding(creditCardId);
    await this.update(creditCardId, { currentOutstanding: outstanding });
  },
};

// ============================================
// CREDIT CARD TRANSACTION OPERATIONS
// ============================================

export const creditCardTransactionService = {
  async getAll(creditCardId: string): Promise<CreditCardTransaction[]> {
    return db.creditCardTransactions
      .where('creditCardId')
      .equals(creditCardId)
      .reverse()
      .sortBy('date');
  },

  async getUnpaid(creditCardId: string): Promise<CreditCardTransaction[]> {
    return db.creditCardTransactions
      .where('creditCardId')
      .equals(creditCardId)
      .filter(t => !t.isPaid)
      .toArray();
  },

  async getById(id: string): Promise<CreditCardTransaction | undefined> {
    return db.creditCardTransactions.get(id);
  },

  async create(data: Omit<CreditCardTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditCardTransaction> {
    const transaction: CreditCardTransaction = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.creditCardTransactions.add(transaction);
    
    // Update credit card outstanding
    await creditCardService.updateOutstanding(data.creditCardId);
    
    return transaction;
  },

  async update(id: string, data: Partial<CreditCardTransaction>): Promise<CreditCardTransaction> {
    const updated = { ...data, updatedAt: new Date() };
    await db.creditCardTransactions.update(id, updated);
    
    const transaction = await db.creditCardTransactions.get(id);
    if (!transaction) throw new Error('Credit card transaction not found');
    
    // Update credit card outstanding
    await creditCardService.updateOutstanding(transaction.creditCardId);
    
    return transaction;
  },

  async delete(id: string): Promise<void> {
    const transaction = await db.creditCardTransactions.get(id);
    if (!transaction) throw new Error('Transaction not found');
    
    await db.creditCardTransactions.delete(id);
    
    // Update credit card outstanding
    await creditCardService.updateOutstanding(transaction.creditCardId);
  },

  async markAsPaid(id: string): Promise<CreditCardTransaction> {
    return this.update(id, { isPaid: true });
  },
};

// ============================================
// LOAN OPERATIONS
// ============================================

export const loanService = {
  async getAll(householdId: string): Promise<Loan[]> {
    return db.loans
      .where('householdId')
      .equals(householdId)
      .toArray();
  },

  async getAllActive(householdId: string): Promise<Loan[]> {
    return db.loans
      .where('householdId')
      .equals(householdId)
      .filter(l => !l.isArchived)
      .toArray();
  },

  async getById(id: string): Promise<Loan | undefined> {
    return db.loans.get(id);
  },

  async create(data: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Loan> {
    const loan: Loan = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.loans.add(loan);
    return loan;
  },

  async update(id: string, data: Partial<Loan>): Promise<Loan> {
    const updated = { ...data, updatedAt: new Date() };
    await db.loans.update(id, updated);
    const loan = await db.loans.get(id);
    if (!loan) throw new Error('Loan not found');
    return loan;
  },

  async delete(id: string): Promise<void> {
    await db.loans.delete(id);
  },

  async archive(id: string): Promise<Loan> {
    return this.update(id, { isArchived: true });
  },

  calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate === 0) return principal / tenureMonths;
    
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / 
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi * 100) / 100;
  },
};

// ============================================
// LOAN PAYMENT OPERATIONS
// ============================================

export const loanPaymentService = {
  async getAll(loanId: string): Promise<LoanPayment[]> {
    return db.loanPayments
      .where('loanId')
      .equals(loanId)
      .reverse()
      .sortBy('paymentDate');
  },

  async getById(id: string): Promise<LoanPayment | undefined> {
    return db.loanPayments.get(id);
  },

  async create(data: Omit<LoanPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<LoanPayment> {
    const payment: LoanPayment = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.loanPayments.add(payment);
    
    // Update loan remaining balance
    const loan = await db.loans.get(data.loanId);
    if (loan) {
      await db.loans.update(data.loanId, {
        remainingBalance: loan.remainingBalance - data.principalPaid,
        updatedAt: new Date(),
      });
    }
    
    return payment;
  },

  async delete(id: string): Promise<void> {
    const payment = await db.loanPayments.get(id);
    if (!payment) throw new Error('Payment not found');
    
    // Revert loan balance
    const loan = await db.loans.get(payment.loanId);
    if (loan) {
      await db.loans.update(payment.loanId, {
        remainingBalance: loan.remainingBalance + payment.principalPaid,
        updatedAt: new Date(),
      });
    }
    
    await db.loanPayments.delete(id);
  },
};

// ============================================
// BUDGET OPERATIONS
// ============================================

export const budgetService = {
  async getAll(householdId: string): Promise<Budget[]> {
    return db.budgets
      .where('householdId')
      .equals(householdId)
      .toArray();
  },

  async getAllActive(householdId: string): Promise<Budget[]> {
    return db.budgets
      .where('householdId')
      .equals(householdId)
      .filter(b => !b.isArchived)
      .toArray();
  },

  async getById(id: string): Promise<Budget | undefined> {
    return db.budgets.get(id);
  },

  async create(data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<Budget> {
    const budget: Budget = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.budgets.add(budget);
    return budget;
  },

  async update(id: string, data: Partial<Budget>): Promise<Budget> {
    const updated = { ...data, updatedAt: new Date() };
    await db.budgets.update(id, updated);
    const budget = await db.budgets.get(id);
    if (!budget) throw new Error('Budget not found');
    return budget;
  },

  async delete(id: string): Promise<void> {
    await db.budgets.delete(id);
  },

  async archive(id: string): Promise<Budget> {
    return this.update(id, { isArchived: true });
  },

  async getActiveEventBudgets(): Promise<Budget[]> {
    // Get current user's household
    const user = await userService.getCurrent();
    if (!user?.householdId) return [];
    
    return db.budgets
      .where('householdId')
      .equals(user.householdId)
      .filter(b => b.status === 'ACTIVE' && b.budgetMode === 'EVENT' && !b.isArchived)
      .toArray();
  },
};

// ============================================
// BUDGET PLAN ITEM OPERATIONS
// ============================================

export const budgetPlanItemService = {
  async getAll(budgetId: string): Promise<BudgetPlanItem[]> {
    return db.budgetPlanItems
      .where('budgetId')
      .equals(budgetId)
      .toArray();
  },

  async getById(id: string): Promise<BudgetPlanItem | undefined> {
    return db.budgetPlanItems.get(id);
  },

  async create(data: Omit<BudgetPlanItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<BudgetPlanItem> {
    const item: BudgetPlanItem = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.budgetPlanItems.add(item);
    return item;
  },

  async update(id: string, data: Partial<BudgetPlanItem>): Promise<BudgetPlanItem> {
    const updated = { ...data, updatedAt: new Date() };
    await db.budgetPlanItems.update(id, updated);
    const item = await db.budgetPlanItems.get(id);
    if (!item) throw new Error('Budget plan item not found');
    return item;
  },

  async delete(id: string): Promise<void> {
    await db.budgetPlanItems.delete(id);
  },
};

// ============================================
// USER & HOUSEHOLD OPERATIONS
// ============================================

export const userService = {
  async getCurrent(): Promise<User | undefined> {
    const users = await db.users.toArray();
    return users[0]; // Single user for now
  },

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.users.add(user);
    return user;
  },

  async update(id: string, data: Partial<User>): Promise<User> {
    const updated = { ...data, updatedAt: new Date() };
    await db.users.update(id, updated);
    const user = await db.users.get(id);
    if (!user) throw new Error('User not found');
    return user;
  },
};

export const householdService = {
  async getCurrent(): Promise<Household | undefined> {
    const households = await db.households.toArray();
    return households[0]; // Single household for now
  },

  async create(data: Omit<Household, 'id' | 'createdAt' | 'updatedAt'>): Promise<Household> {
    const household: Household = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.households.add(household);
    return household;
  },

  async update(id: string, data: Partial<Household>): Promise<Household> {
    const updated = { ...data, updatedAt: new Date() };
    await db.households.update(id, updated);
    const household = await db.households.get(id);
    if (!household) throw new Error('Household not found');
    return household;
  },
};
