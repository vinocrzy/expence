# Data Models & Service APIs Reference

Source of truth: `frontend/lib/db-types.ts`
Service layer: `frontend/lib/localdb-services.ts`

---

## TypeScript Interfaces

### Account
```typescript
interface Account {
  id: string;
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'CASH' | 'WALLET';
  balance: number;           // Always calculated — updated by transactionService
  currency: string;          // e.g. "INR", "USD"
  householdId: string;
  isArchived?: boolean;
}
```

### Transaction
```typescript
interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'DEBT';
  date: string;              // ISO 8601 string
  categoryId?: string;
  subCategoryId?: string;    // Granular sub-category tracking
  accountId: string;
  description?: string;
  householdId: string;
  // Transfer fields
  toAccountId?: string;
  // Split transaction
  isSplit?: boolean;
  splitItems?: SplitItem[];
}
```

### Category
```typescript
interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  subCategories?: { id: string; name: string }[];
  icon?: string;             // Lucide icon name
  color?: string;            // Tailwind color class
}
```

### CreditCard
```typescript
interface CreditCard {
  id: string;
  name: string;
  creditLimit?: number;
  currentOutstanding?: number;   // Updated by credit card transaction service
  billingCycle?: number;         // Day of month billing starts
  paymentDueDay?: number;        // Day of month payment is due
  householdId: string;
  statements?: CreditCardStatement[];
}

interface CreditCardStatement {
  id: string;
  creditCardId: string;
  startDate: string;
  endDate: string;
  closingBalance: number;
  minimumDue: number;          // 5% of outstanding
  isPaid: boolean;
}
```

### Loan
```typescript
interface Loan {
  id: string;
  name: string;
  principalAmount: number;
  outstandingPrincipal: number;
  interestRate: number;        // Annual percentage
  tenureMonths: number;
  emiAmount: number;           // Calculated client-side via financial-math.ts
  startDate: string;
  householdId: string;
}
```

### Budget
```typescript
interface Budget {
  id: string;
  name: string;
  mode: 'EVENT' | 'RECURRING' | 'CATEGORY';
  totalAmount: number;
  startDate: string;
  endDate?: string;
  householdId: string;
  planItems?: BudgetPlanItem[];
}

interface BudgetPlanItem {
  id: string;
  budgetId: string;
  categoryId: string;
  plannedAmount: number;
  description?: string;
}
```

---

## Service Singletons

All services are exported from `frontend/lib/localdb-services.ts`:

### transactionService
```typescript
transactionService.create(data)    // Also updates Account.balance or CreditCard.outstanding
transactionService.update(id, data) // Reverses old impact, applies new
transactionService.delete(id)      // Reverses balance impact before deleting
transactionService.getAll(householdId)
transactionService.getById(id)
transactionService.getByDateRange(householdId, startDate, endDate)
transactionService.getByAccount(accountId)
```

### accountService
```typescript
accountService.create(data)
accountService.update(id, data)
accountService.delete(id)
accountService.getAll(householdId)
accountService.getById(id)
accountService.archive(id)
```

### categoryService
```typescript
categoryService.create(data)
categoryService.update(id, data)
categoryService.delete(id)        // Validates no transactions use this category
categoryService.getAll()
categoryService.getById(id)
categoryService.addSubCategory(categoryId, subCategory)
```

### creditCardService
```typescript
creditCardService.create(data)
creditCardService.update(id, data)
creditCardService.delete(id)
creditCardService.getAll(householdId)
creditCardService.generateStatement(creditCardId, startDate, endDate)
```

### loanService
```typescript
loanService.create(data)           // Calculates EMI via financial-math.ts
loanService.update(id, data)
loanService.delete(id)
loanService.getAll(householdId)
loanService.recordPayment(loanId, amount)  // Updates outstandingPrincipal
```

### budgetService
```typescript
budgetService.create(data)
budgetService.update(id, data)
budgetService.delete(id)
budgetService.getAll(householdId)
budgetService.getSpendingSummary(budgetId)  // Compares planned vs actual
```

---

## Financial Calculation Utilities

### `frontend/lib/financial-math.ts`

```typescript
// EMI calculation
calculateEMI(principal: number, annualRate: number, tenureMonths: number): number

// Total interest payable
calculateTotalInterest(emi: number, tenureMonths: number, principal: number): number

// Amortization schedule
generateAmortizationSchedule(loan: Loan): AmortizationEntry[]
```

### `frontend/lib/analytics.ts`

```typescript
// Monthly income vs expense summary
getMonthlyBreakdown(householdId: string, year: number): MonthlyBreakdown[]

// Category-level spending pie chart data
getCategoryBreakdown(householdId: string, startDate: string, endDate: string): CategoryBreakdown[]

// Net worth snapshot
getNetWorth(householdId: string): Promise<number>

// Income vs Expense trend (line chart data)
getIncomeExpenseTrend(householdId: string, months: number): TrendData[]
```

---

## Business Logic Rules

| Rule | Enforced In |
|------|-------------|
| Account balance updated on transaction create/edit/delete | `transactionService` |
| CreditCard outstanding updated on credit transaction | `creditCardService` |
| EMI calculated at loan creation (not stored raw) | `loanService.create` → `financial-math.ts` |
| Category cannot be deleted if in use | `categoryService.delete` |
| Statement `minimumDue` = 5% of `closingBalance` | `creditCardService.generateStatement` |
| All documents scoped by `householdId` | All services |
| Sub-categories belong to a parent category (embedded array) | Schema in `categoriesDb` |

---

## Hooks Pattern

```typescript
// Example: load transactions reactively
import { useEffect, useState } from "react";
import { transactionService } from "@/lib/localdb-services";

function useTransactions(householdId: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    transactionService.getAll(householdId).then(setTransactions);
    // Subscribe to PouchDB changes for reactivity
    const changes = transactionsDb.changes({ live: true, since: "now" })
      .on("change", () => transactionService.getAll(householdId).then(setTransactions));
    return () => changes.cancel();
  }, [householdId]);

  return transactions;
}
```

Custom hooks live in `frontend/hooks/`. Always cancel PouchDB `changes()` listeners on unmount.
