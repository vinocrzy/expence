# 🔄 Component Migration Checklist

This checklist helps you convert existing API-based components to use the local-first architecture.

## 📋 General Migration Steps

### Step 1: Identify API Calls

Find all instances of:
- `fetch('/api/...')`
- `axios.get/post/put/delete(...)`
- API utility functions

### Step 2: Import Local Services

```typescript
// Add at top of file
import { 
  transactionService,
  accountService,
  categoryService,
  creditCardService,
  loanService,
  budgetService,
} from '@/lib/localdb-services';
```

### Step 3: Replace API Calls

| API Endpoint | Local Service Method |
|--------------|---------------------|
| `GET /api/transactions` | `transactionService.getAll(householdId)` |
| `GET /api/transactions/:id` | `transactionService.getById(id)` |
| `POST /api/transactions` | `transactionService.create(data)` |
| `PUT /api/transactions/:id` | `transactionService.update(id, data)` |
| `DELETE /api/transactions/:id` | `transactionService.delete(id)` |
| `GET /api/accounts` | `accountService.getAll(householdId)` |
| `GET /api/categories` | `categoryService.getAll(householdId)` |
| `GET /api/analytics/...` | `calculateMonthlyStats()` from `@/lib/analytics` |

### Step 4: Remove Loading States

Since local operations are instant, you can often remove loading spinners:

**Before**:
```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  fetch('/api/data')
    .then(res => res.json())
    .then(data => {
      setData(data);
      setLoading(false);
    });
}, []);

if (loading) return <Spinner />;
```

**After**:
```typescript
useEffect(() => {
  async function load() {
    const data = await service.getAll(householdId);
    setData(data);
  }
  load();
}, []);

// No loading state needed!
```

### Step 5: Update Error Handling

**Before**:
```typescript
try {
  const res = await fetch('/api/data');
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();
} catch (error) {
  console.error('Network or server error:', error);
}
```

**After**:
```typescript
try {
  const data = await service.getAll(householdId);
} catch (error) {
  console.error('Database error:', error);
}
```

### Step 6: Remove Optimistic Updates

With local-first, updates are instant and consistent - no need for optimistic UI updates!

**Before**:
```typescript
// Optimistically update UI
setTransactions(prev => [...prev, newTransaction]);

// Then update server
try {
  await fetch('/api/transactions', { method: 'POST', ... });
} catch (error) {
  // Rollback on error
  setTransactions(prev => prev.filter(t => t.id !== newTransaction.id));
}
```

**After**:
```typescript
// Just update local DB (instant and reliable)
const newTransaction = await transactionService.create(data);
// Refresh from DB
const transactions = await transactionService.getAll(householdId);
setTransactions(transactions);
```

## 📝 Component-Specific Checklists

### ✅ Transaction Components

**Files to update**:
- [ ] `app/transactions/page.tsx`
- [ ] `components/TransactionModal.tsx`
- [ ] `components/TransactionList.tsx` (if exists)

**Changes**:
- [ ] Replace `fetch('/api/transactions')` with `transactionService.getAll()`
- [ ] Replace `fetch('/api/transactions/:id')` with `transactionService.getById()`
- [ ] Replace POST request with `transactionService.create()`
- [ ] Replace PUT request with `transactionService.update()`
- [ ] Replace DELETE request with `transactionService.delete()`
- [ ] Remove loading states
- [ ] Update error messages (no more "Network error")

### ✅ Account Components

**Files to update**:
- [ ] `app/accounts/page.tsx`
- [ ] `components/AccountModal.tsx`

**Changes**:
- [ ] Replace `fetch('/api/accounts')` with `accountService.getAll()`
- [ ] Replace account creation with `accountService.create()`
- [ ] Replace balance updates with `accountService.update()`
- [ ] Add total balance calculation: `accountService.calculateTotalBalance()`

### ✅ Credit Card Components

**Files to update**:
- [ ] `app/credit-cards/page.tsx`
- [ ] `components/CreditCardModal.tsx`
- [ ] `components/CreditCardPaymentModal.tsx`

**Changes**:
- [ ] Replace API calls with `creditCardService` methods
- [ ] Use `creditCardTransactionService` for transactions
- [ ] Outstanding calculation: `creditCardService.calculateOutstanding()`
- [ ] Payment: `creditCardTransactionService.markAsPaid()`

### ✅ Loan Components

**Files to update**:
- [ ] `app/loans/page.tsx`
- [ ] `components/LoanModal.tsx`
- [ ] `components/PrepaymentModal.tsx`

**Changes**:
- [ ] Replace API calls with `loanService` methods
- [ ] Use `loanPaymentService` for payments
- [ ] EMI calculation: `loanService.calculateEMI()`
- [ ] Amortization: `calculateAmortizationSchedule()` from analytics

### ✅ Budget Components

**Files to update**:
- [ ] `app/budgets/page.tsx`
- [ ] Budget creation/edit components

**Changes**:
- [ ] Replace API calls with `budgetService` methods
- [ ] Use `budgetPlanItemService` for budget items
- [ ] Calculate utilization locally

### ✅ Analytics/Dashboard

**Files to update**:
- [ ] `app/dashboard/page.tsx`
- [ ] `app/analytics/page.tsx`

**Changes**:
- [ ] Replace analytics API with functions from `@/lib/analytics`:
  - [ ] `calculateMonthlyStats()`
  - [ ] `calculateCategoryBreakdown()`
  - [ ] `calculateTrends()`
  - [ ] `getCashFlowSummary()`
  - [ ] `getTopSpendingCategories()`
- [ ] All calculations are now instant!

### ✅ Reports

**Files to update**:
- [ ] `app/reports/page.tsx`
- [ ] Report generation components

**Changes**:
- [ ] Fetch data locally instead of API
- [ ] Generate Excel/PDF from local data
- [ ] Use analytics functions for calculations

## 🔧 Special Cases

### Authentication

**Keep using API** for:
- Login
- Signup
- Password reset
- Token refresh

**Why?**: Auth needs server validation

### Backup/Restore

**Already implemented** in:
- `lib/backup.ts`
- `components/BackupManager.tsx`
- `app/settings/backup/page.tsx`

No changes needed!

### First Launch

**Already implemented** in:
- `lib/migration.ts`
- `components/MigrationWizard.tsx`
- `context/LocalFirstContext.tsx`

No changes needed!

## ✨ Quick Wins

Easy replacements that give immediate benefits:

### 1. Read Operations (Queries)

```typescript
// ❌ Before
const res = await fetch('/api/transactions');
const data = await res.json();

// ✅ After (10-20x faster!)
const data = await transactionService.getAll(householdId);
```

### 2. Create Operations

```typescript
// ❌ Before
const res = await fetch('/api/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
const transaction = await res.json();

// ✅ After (simpler & faster!)
const transaction = await transactionService.create(data);
```

### 3. Update Operations

```typescript
// ❌ Before
await fetch(`/api/transactions/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updates)
});

// ✅ After
await transactionService.update(id, updates);
```

### 4. Delete Operations

```typescript
// ❌ Before
await fetch(`/api/transactions/${id}`, { method: 'DELETE' });

// ✅ After
await transactionService.delete(id);
```

## 🧪 Testing Checklist

After migration, test:

- [ ] Create new record
- [ ] Update existing record
- [ ] Delete record
- [ ] List all records
- [ ] Filter/search records
- [ ] Offline functionality (disconnect internet)
- [ ] Page refresh (data persists)
- [ ] Browser restart (data persists)
- [ ] Backup creation
- [ ] Backup restore

## 🚨 Common Pitfalls

### 1. Forgetting householdId

Most queries need householdId:

```typescript
// ❌ Wrong
const transactions = await transactionService.getAll();

// ✅ Correct
const transactions = await transactionService.getAll(householdId);
```

### 2. Not awaiting async operations

```typescript
// ❌ Wrong
transactionService.create(data); // Not awaited!
loadData(); // Runs before create finishes!

// ✅ Correct
await transactionService.create(data);
await loadData();
```

### 3. Still showing loading spinners

```typescript
// ❌ Unnecessary
const [loading, setLoading] = useState(true);
setLoading(true);
const data = await service.getAll();
setLoading(false);

// ✅ Better (data loads in <50ms)
const data = await service.getAll();
setData(data);
```

### 4. Not refreshing after mutations

```typescript
// ❌ UI doesn't update
await transactionService.create(data);
// Need to refresh!

// ✅ Refresh after mutation
await transactionService.create(data);
const transactions = await transactionService.getAll(householdId);
setTransactions(transactions);
```

## 📊 Progress Tracking

Track your migration progress:

### Core Features
- [ ] Transactions (CRUD)
- [ ] Accounts (CRUD)
- [ ] Categories (CRUD)
- [ ] Credit Cards (CRUD)
- [ ] Loans (CRUD)
- [ ] Budgets (CRUD)

### Analytics
- [ ] Dashboard stats
- [ ] Monthly breakdown
- [ ] Category analysis
- [ ] Trends/charts
- [ ] Reports

### UI/UX
- [ ] Remove loading states
- [ ] Update error messages
- [ ] Add offline indicators
- [ ] Test offline mode
- [ ] Add backup UI

### Testing
- [ ] All features work offline
- [ ] Data persists on refresh
- [ ] Backup/restore works
- [ ] Performance is fast
- [ ] No console errors

## 🎉 Benefits After Migration

Once complete, you'll have:

- ⚡ **10-20x faster** operations
- 🌐 **100% offline** functionality
- 🔒 **Privacy-first** architecture
- 💪 **More resilient** app
- 🐛 **Easier debugging**
- 💰 **Lower costs** (less backend load)

## 🆘 Need Help?

Refer to:
1. [LOCAL_FIRST_GUIDE.md](./LOCAL_FIRST_GUIDE.md) - Full documentation
2. [examples/LocalFirstExample.tsx](../frontend/components/examples/LocalFirstExample.tsx) - Code examples
3. Console logs - Check for error messages
4. Dexie DevTools - Inspect IndexedDB in browser

---

**Happy migrating! 🚀**
