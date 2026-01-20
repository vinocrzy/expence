/**
 * Local-First Database using Dexie.js (IndexedDB)
 * This is the single source of truth for all app data
 */

import Dexie, { Table } from 'dexie';

// Type definitions matching backend Prisma schema
export interface User {
  id: string;
  email: string;
  name?: string;
  householdId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  defaultCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  isArchived: boolean;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  amount: number;
  type: string;
  description?: string;
  date: Date;
  categoryId: string;
  accountId: string;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditCard {
  id: string;
  name: string;
  bankName: string;
  lastFourDigits: string;
  billingCycle: number;
  paymentDueDay: number;
  creditLimit: number;
  currentOutstanding: number;
  isArchived: boolean;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditCardTransaction {
  id: string;
  creditCardId: string;
  amount: number;
  description?: string;
  date: Date;
  categoryId?: string;
  isPaid: boolean;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Loan {
  id: string;
  name: string;
  lenderName: string;
  principalAmount: number;
  interestRate: number;
  tenure: number;
  startDate: Date;
  emiAmount: number;
  remainingBalance: number;
  isArchived: boolean;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  paymentDate: Date;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  name: string;
  budgetMode: string;
  period: string;
  startDate: Date;
  endDate?: Date;
  totalBudget: number;
  totalSpent: number;
  status: string;
  isArchived: boolean;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetPlanItem {
  id: string;
  budgetId: string;
  categoryId?: string;
  amount: number;
  spent: number;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  id: string;
  userId: string;
  lastBackupTime?: Date;
  backupStatus?: 'success' | 'failed' | 'pending' | 'never';
  backupError?: string;
  theme?: string;
  language?: string;
  updatedAt: Date;
}

// Dexie Database Class
export class ExpenseDatabase extends Dexie {
  users!: Table<User, string>;
  households!: Table<Household, string>;
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  creditCards!: Table<CreditCard, string>;
  creditCardTransactions!: Table<CreditCardTransaction, string>;
  loans!: Table<Loan, string>;
  loanPayments!: Table<LoanPayment, string>;
  budgets!: Table<Budget, string>;
  budgetPlanItems!: Table<BudgetPlanItem, string>;
  appSettings!: Table<AppSettings, string>;

  constructor() {
    super('ExpenseTrackerDB');
    
    this.version(1).stores({
      users: 'id, email, householdId',
      households: 'id, inviteCode',
      accounts: 'id, householdId, isArchived, type',
      categories: 'id, householdId, type',
      transactions: 'id, householdId, accountId, categoryId, date, type',
      creditCards: 'id, householdId, isArchived',
      creditCardTransactions: 'id, creditCardId, householdId, date, isPaid',
      loans: 'id, householdId, isArchived',
      loanPayments: 'id, loanId, householdId, paymentDate',
      budgets: 'id, householdId, period, status, isArchived',
      budgetPlanItems: 'id, budgetId, categoryId, householdId',
      appSettings: 'id, userId',
    });
  }
}

// Singleton instance
export const db = new ExpenseDatabase();

// Helper function to generate UUID (mimicking backend)
export function generateId(): string {
  return crypto.randomUUID();
}

// Export database stats for UI
export async function getDatabaseStats() {
  const [
    userCount,
    accountCount,
    transactionCount,
    creditCardCount,
    loanCount,
    budgetCount,
  ] = await Promise.all([
    db.users.count(),
    db.accounts.count(),
    db.transactions.count(),
    db.creditCards.count(),
    db.loans.count(),
    db.budgets.count(),
  ]);

  return {
    userCount,
    accountCount,
    transactionCount,
    creditCardCount,
    loanCount,
    budgetCount,
    totalRecords: userCount + accountCount + transactionCount + creditCardCount + loanCount + budgetCount,
  };
}
