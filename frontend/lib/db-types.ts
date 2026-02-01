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
  apr?: number;
  isArchived?: boolean;
  householdId: string;
  createdAt?: string;
  updatedAt?: string;
  _rev?: string;
}

export interface Loan {
  id: string;
  name: string;
  lender?: string;
  type?: string; 
  principal: number;
  interestRate: number;
  tenureMonths: number;
  startDate: string;
  initialPaidEmis?: number;
  emiAmount?: number;
  outstandingPrincipal: number;
  status?: 'ACTIVE' | 'CLOSED';
  linkedAccountId?: string;
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

export interface Household {
  id: string; 
  name: string;
  ownerId: string; 
  inviteCode: string; 
  members: {
      userId: string;
      name: string;
      email: string;
      role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
      joinedAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
  _rev?: string;
  _id?: string;
}

export interface SharedTransaction {
    id: string;
    date: string;
    amount: number;
    type: string;
    categoryName: string;
    description: string;
    accountName: string;
    user: string;
}

export interface SharedAccountBalance {
    id: string;
    name: string;
    type: string;
    balance: number;
    currency: string;
}

export interface SharedBudget {
    id: string;
    name: string;
    totalBudget: number;
    totalSpent: number;
}
