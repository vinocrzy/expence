export interface Account {
  id: string;
  name: string;
  type: string; // CHECKING, SAVINGS, etc.
  balance?: number;
  currency: string;
  isArchived?: boolean;
  householdId: string;
  userId?: string; // ID of the user who owns/created this account
  createdByName?: string; // Name of the creator
  createdAt?: string;
  updatedAt?: string;
  _rev?: string; // PouchDB revision
  _id?: string;  // PouchDB ID (same as id usually)
}

export interface Transaction {
  id: string;
  amount: number;
  type: string; // INCOME, EXPENSE, TRANSFER, INVESTMENT
  description?: string;
  date: string;
  categoryId?: string;
  subCategoryId?: string; // New: Sub-category ID
  accountId: string;
  householdId: string;
  userId?: string; // ID of the user who made the transaction
  createdByName?: string; // Name of the user
  userColor?: string; // Visual indicator for the user
  createdAt?: string;
  updatedAt?: string;
  _rev?: string;
  isSplit?: boolean;
  splits?: { id: string; amount: number; categoryId: string; note?: string }[];
}

export interface Category {
  id: string;
  name: string;
  type?: string; // INCOME, EXPENSE
  icon?: string;
  color?: string;
  subCategories?: { id: string; name: string }[]; // New: Sub-categories
  isActive?: boolean; // Default true
  householdId: string;
  createdAt?: string;
  updatedAt?: string;
  _rev?: string;
}

export interface CreditCardStatement {
  id: string;
  statementDate: string;
  cycleStart: string;
  cycleEnd: string;
  dueDate: string;
  closingBalance: number;
  minimumDue: number;
  totalPayments: number;
  status: 'PAID' | 'UNPAID' | 'OVERDUE' | 'PARTIAL';
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
  statements?: CreditCardStatement[];
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
  paidEmis?: number; // Number of EMIs paid via app
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

export interface BudgetCategoryLimit {
  categoryId: string;
  amount: number;
}

export interface Budget {
  id: string;
  name: string;
  budgetMode?: 'EVENT' | 'RECURRING' | 'CATEGORY';
  categoryId?: string; // Legacy/Single Mode
  budgetLimitConfig?: BudgetCategoryLimit[]; // New Multi-Category Mode
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
