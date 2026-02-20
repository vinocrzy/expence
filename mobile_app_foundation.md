# PocketTogether: Native Mobile App Foundation

This document serves as the "Source of Truth" for rebuilding the **PocketTogether** financial application as a native mobile experience (React Native / iOS / Android). It encapsulates the brand identity, design patterns, and core business logic derived from the existing web application.

---

## 1. Brand Identity & Philosophy

**Core Essence**: "Financial Clarity through Native Elegance."
The app is not just a utility; it is a premium financial cockpit. It should feel:
-   **Intimate**: Personal and private.
-   **Premium**: High-end aesthetics, deep blacks, subtle glows.
-   **Calm**: No shouting; precise and guiding data.

### Visual Metaphor: "The Cockpit"
Dark, focused environment with glowing instruments (gradients) that provide critical data at a glance.

---

## 2. Design System ("Dark Glass")

The design system is built around the concept of **Dark Glass**—layers of translucent material over a deep space background.

### 2.1 Color Palette

**Foundations (Backgrounds)**
| Token | Hex | Usage |
| :--- | :--- | :--- |
| `bg-primary` | `#000000` | The infinite background. Used for all main screens. |
| `bg-surface` | `#1c1c1e` | The physical card material. Used for widgets, lists, and sheets. |
| `border-subtle`| `rgba(255, 255, 255, 0.05)` | The delicate edge lighting on glass components. |

**Brand Gradients**
-   **Primary Brand**: Linear Gradient (`#3B82F6` -> `#9333EA`) (Blue to Purple)
-   **Secondary Brand**: Linear Gradient (`#06B6D4` -> `#3B82F6`) (Cyan to Blue)

**Semantic Colors (Text/Icon Highlighting)**
Used against dark backgrounds. Use 400-500 scale equivalents.
-   **Income/Safe**: `text-green-400` / `bg-green-500` (20% opacity)
-   **Expense/Debt**: `text-red-400` / `bg-red-500` (20% opacity)
-   **Warning/Limit**: `text-orange-400` / `bg-orange-500` (20% opacity)
-   **Info/Insight**: `text-blue-400` / `bg-blue-500` (20% opacity)

### 2.2 Typography
Use the **System Font Stack** (San Francisco on iOS, Roboto/Inter on Android) to feel truly native.

-   **Headings**: Bold, tight tracking.
-   **Numbers/Currency**: Monospace (`font-mono`) or tabular nums variant to ensure alignment.
-   **Labels**: Uppercase, small, bold, wide tracking (`text-xs tracking-wider`).

### 2.3 UI Components & Shapes

**The Glass Card**
Every major container (Widget, List Group) must follow this style:
-   **Background**: `#1c1c1e` with **80% Opacity**.
-   **Blur**: High intensity backdrop blur (`blur(20px)` / `backdrop-blur-xl`).
-   **Border**: 1px solid `rgba(255, 255, 255, 0.05)`.
-   **Corner Radius**: `24px` (approx `rounded-3xl`) for containers.

**Lists**
-   **Style**: "Inset Grouped" (iOS style).
-   **Separators**: Thin lines (`1px solid white/5`) between items, but not after the last item.

---

## 3. Core Architecture: Local-First

The application is **Offline-First**. Data lives on the device.

-   **Database**: PouchDB / RxDB (running over SQLite or AsyncStorage in Native).
-   **Sync**: (Optional) Replication to a remote CouchDB instance.
-   **State Management**: Reactive. The UI should subscribe to DB changes and update instantly without manual refreshes.

---

## 4. Data Models (Schema)

These are the core entities that must be replicated in the local database.

### Account
Represents a wallet, bank account, or cash.
```typescript
interface Account {
  id: string; // UUID
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'CASH' | 'WALLET';
  balance: number; // Current calculated balance
  currency: string;
  householdId: string;
  isArchived: boolean;
}
```

### Transaction
The central unit of the system.
```typescript
interface Transaction {
  id: string; // UUID
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'DEBT';
  date: string; // ISO Date String
  description?: string;
  categoryId?: string;
  subCategoryId?: string; // Optional drill-down
  accountId: string; // Source account (or Credit Card ID)
  isSplit?: boolean; // If true, ignore categoryId and use splits
  splits?: { id: string; amount: number; categoryId: string }[];
}
```

### Credit Card
Distinct from Accounts. Tracks debt and billing cycles.
```typescript
interface CreditCard {
  id: string;
  name: string;
  creditLimit: number;
  currentOutstanding: number; // Amount currently owed
  billingCycle: number; // Day of month (e.g., 1st)
  paymentDueDay: number; // Day of month (e.g., 20th)
  // Statements are generated monthly
  statements: CreditCardStatement[];
}

interface CreditCardStatement {
  id: string;
  cycleStart: string;
  cycleEnd: string;
  dueDate: string;
  closingBalance: number;
  minimumDue: number; // 5% of closing balance
  status: 'PAID' | 'UNPAID' | 'OVERDUE';
}
```

### Loan
Tracks Amortized loans (Principal + Interest).
```typescript
interface Loan {
  id: string;
  name: string;
  principal: number; // Original Amount
  interestRate: number; // Annual %
  tenureMonths: number;
  emiAmount: number; // Calculated or Fixed
  outstandingPrincipal: number; // Remaining
  startDate: string;
  status: 'ACTIVE' | 'CLOSED';
}
```

### Budget
```typescript
interface Budget {
  id: string;
  type: 'CATEGORY' | 'EVENT' | 'RECURRING';
  limits: { categoryId: string; amount: number }[]; // Multi-category support
  period: 'MONTHLY' | 'ONE_TIME';
  startDate: string;
  endDate: string;
}
```

---

## 5. Business Logic Rules

### 5.1 Transaction Processing
**Reactive Balance Updates**:
-   **Income**: `Account.balance += amount` (or `CreditCard.outstanding -= amount`)
-   **Expense**: `Account.balance -= amount` (or `CreditCard.outstanding += amount`)
-   **Transfer**: Debit Source, Credit Destination.

**Edits/Deletes**:
-   Must **Revert** the previous effect (inverse operation) and **Apply** the new effect.
-   Example: Changing a transaction from $50 to $100 requires removing $50 from the balance logic and then adding $100 (or simpler: applying the delta).

### 5.2 Credit Cards
-   **Billing Cycle**: Logic runs to detect if a cycle has closed.
-   **Statement Generation**:
    -   Triggered when `Today > Billing Day`.
    -   Calculates `Closing Balance` = Previous Outstanding + New Expenses - Invalid Payments.
    -   `Minimum Due` = 5% of Closing Balance.
    -   `Due Date` = Cycle End Date + 20 Days (Grace Period).

### 5.3 Loans
-   **EMI Calculation**: Standard Amortization Formula.
-   `EMI = [P x R x (1+R)^N] / [(1+R)^N-1]`
-   **Payments**: Recording a loan payment reduces `outstandingPrincipal`.
-   **Closure**: When `outstandingPrincipal <= 0`, status becomes `CLOSED`.

### 5.4 Analytics (Client-Side)
-   **Monthly Stats**: Aggregated by iterating strictly over transactions within the `startDate` and `endDate`.
-   **Category Breakdown**:
    -   Group by `categoryId`.
    -   Handle **Splits**: If a transaction is split, loop through its `splits` array and attribute amounts to their respective categories.
    -   **Filters**: "Expense" breakdown should exclude 'INVESTMENT' and 'DEBT' type categories unless explicitly requested.

---

## 6. Mobile Implementation Recommendations

### 6.1 Tech Stack
-   **Framework**: React Native (via Expo recommended).
-   **Styling**: `NativeWind` (Tailwind for RN) to reuse the existing class names and tokens.
-   **Database**: `WatermelonDB` (Great for reactive local-first) or `RxDB` with `expo-sqlite` adapter.
-   **Navigation**: `expo-router` (File-based, matches Next.js mental model).

### 6.2 Performance Hints
-   **Lists**: Use `@shopify/flash-list` for transaction lists (thousands of items).
-   **Charts**: Use `react-native-gifted-charts` or `victory-native` for high-performance visualizations.
-   **Blur**: Use `expo-blur` for the Glassmorphism effect. Note: Android blur is expensive; consider a translucent fallback or precise opacity tuning.
