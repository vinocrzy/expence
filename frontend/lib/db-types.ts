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
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'DEBT';
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
  transferAccountId?: string; // ID of the destination account for transfers
  tags?: string[]; // Free-form tags for occasion/event tracking (e.g. "Valentine's Day", "Goa Trip")
}

export interface Category {
  id: string;
  name: string;
  type?: 'INCOME' | 'EXPENSE' | 'INVESTMENT' | 'DEBT';
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

// ── Envelope Strategy ─────────────────────────────────────────────────────────

/** Per-envelope allocation + rollover config (parallel to BudgetCategoryLimit) */
export interface EnvelopeConfig {
  categoryId: string;
  /** Allocated spend limit for this envelope in the current period */
  allocated: number;
  /** Whether leftover funds roll over into the next period */
  rolloverEnabled?: boolean;
  /** Accumulated rollover amount carried in from the previous period */
  rolloverAmount?: number;
}

/** A fund movement between two envelopes within the same budget */
export interface EnvelopeTransfer {
  id: string;
  fromCategoryId: string;
  toCategoryId: string;
  amount: number;
  date: string; // ISO
  note?: string;
}

/** Runtime state of a single envelope (not persisted – computed on render) */
export interface EnvelopeState {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon?: string;
  allocated: number;
  spent: number;
  /** Net transfer in (+) / out (−) for this period */
  netTransfer: number;
  rollover: number;
  /** allocated + rollover + netTransfer − spent */
  available: number;
  rolloverEnabled: boolean;
  isOverBudget: boolean;
}

// ── Budget ────────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  name: string;
  budgetMode?: 'EVENT' | 'RECURRING' | 'CATEGORY';
  categoryId?: string; // Legacy/Single Mode
  budgetLimitConfig?: BudgetCategoryLimit[]; // Standard Multi-Category Mode
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

  // ── Envelope addon fields (only present when budgetStrategy === 'ENVELOPE') ──
  /** 'STANDARD' (default / legacy) or 'ENVELOPE' */
  budgetStrategy?: 'STANDARD' | 'ENVELOPE';
  /** Per-envelope allocation + rollover settings */
  envelopeConfig?: EnvelopeConfig[];
  /** Fund transfers between envelopes – stored on the budget doc for offline safety */
  envelopeTransfers?: EnvelopeTransfer[];
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

// ── Salary-Cycle / Household Settings ────────────────────────────────────────

/**
 * Controls whether RECURRING budgets use strict calendar-month windows or
 * salary-cycle windows (last-working-day-of-month to last-working-day-of-month).
 */
export interface SalaryCycleSettings {
  /**
   * CALENDAR – standard Jan 1 → Jan 31 windows (default, backward-compatible).
   * SALARY   – window runs from the last working day of the previous month
   *            up to (but not including) the last working day of the current
   *            month, reflecting how salary is credited at end-of-month and
   *            consumed the following month.
   */
  cycleType: 'CALENDAR' | 'SALARY';
}

/**
 * Placeholder for future multi-income support (not used in phase 1).
 * Stored on HouseholdSettings so the data model is forward-compatible.
 */
export interface IncomeSourceRule {
  id: string;
  /** Human-readable label, e.g. "Primary Salary" */
  name: string;
  /** How the credit date is calculated for this source */
  cycleType: 'LAST_WORKING_DAY';
  /** Optional: restrict to a specific account */
  accountId?: string;
}

/**
 * Per-household settings document stored in settingsDB.
 * One document per household; _id is always `settings_<householdId>`.
 */
export interface HouseholdSettings {
  id: string;
  householdId: string;
  salaryCycle: SalaryCycleSettings;
  /** Future: additional income sources beyond the primary salary */
  incomeSourceRules?: IncomeSourceRule[];
  createdAt?: string;
  updatedAt?: string;
  _rev?: string;
  _id?: string;
}

export interface RecurringTransaction {
  id: string;
  name: string; // "LIC Policy", "Car Loan EMI"
  amount: number;
  type: 'EXPENSE' | 'INVESTMENT' | 'DEBT' | 'INCOME' | 'TRANSFER'; // Added INCOME/TRANSFER for flexibility
  frequency: 'MONTHLY' | 'YEARLY' | 'QUARTERLY' | 'WEEKLY' | 'DAILY';
  startDate: string;
  nextDueDate: string;
  categoryId?: string;
  subCategoryId?: string; // Sub-category ID
  accountId?: string; // Source account to debit from
  autoPay?: boolean; // If true, system might auto-create tx (future feature)
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  description?: string;
  lastPaidDate?: string;
  householdId: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  _rev?: string;
  _id?: string;
}
