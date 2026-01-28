export interface Account {
  id: string;
  name: string;
  type: string; // CHECKING, SAVINGS, etc.
  balance?: number;
  currency: string;
  isArchived?: boolean;
  householdId: string;
  createdAt?: string;
  updatedAt?: string;
  _rev?: string; // PouchDB revision
  _id?: string;  // PouchDB ID (same as id usually)
}

export interface Transaction {
  id: string;
  amount: number;
  type: string; // INCOME, EXPENSE, TRANSFER
  description?: string;
  date: string;
  categoryId?: string;
  accountId: string;
  householdId: string;
  createdAt?: string;
  updatedAt?: string;
  _rev?: string;
}

export interface Category {
  id: string;
  name: string;
  type?: string; // INCOME, EXPENSE
  icon?: string;
  color?: string;
  isActive?: boolean; // Default true
  householdId: string;
  createdAt?: string;
  updatedAt?: string;
  _rev?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bankName?: string;
  lastFourDigits?: string;
  billingCycle?: number;
  paymentDueDay?: number;
  creditLimit?: number;
  currentOutstanding?: number;
  isArchived?: boolean;
  householdId: string;
  createdAt?: string;
  updatedAt?: string;
  _rev?: string;
}

export interface Loan {
  id: string;
  name: string;
  lenderName?: string;
  principalAmount: number;
  interestRate?: number;
  tenure?: number;
  startDate?: string;
  emiAmount?: number;
  remainingBalance?: number;
  isArchived?: boolean;
  householdId: string;
  createdAt?: string;
  updatedAt?: string;
  _rev?: string;
}

export interface BudgetPlanItem {
  id: string;
  name: string;
  unitAmount?: number;
  quantity?: number;
  totalAmount?: number;
}

export interface Budget {
  id: string;
  name: string;
  budgetMode?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  totalSpent?: number;
  status?: string;
  isArchived?: boolean;
  householdId: string;
  createdAt?: string;
  updatedAt?: string;
  planItems?: BudgetPlanItem[];
  _rev?: string;
}
