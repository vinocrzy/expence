# Project Documentation: Personal Finance Manager

## 1. Project Overview
This application is a **Local-First, Offline-First Personal Finance Manager**. It is designed to run primarily in the browser as a Progressive Web App (PWA), ensuring users have full control over their data with zero reliance on a continuous internet connection.

**Key Philosophy:**
- **Privacy**: Data lives on the user's device by default.
- **Performance**: Zero-latency interactions due to local database operations.
- **Resilience**: Full functionality (add transactions, view analytics) while offline.

---

## 2. Technical Architecture

### 2.1 High-Level Architecture
The application follows a **Local-First** architecture. The "Backend" is optional and only serves as a synchronization point (CouchDB) or for hosting the static frontend assets.

*   **Frontend**: Next.js 16 application serving the UI and business logic.
*   **Database**: PouchDB (running over IndexedDB) in the browser.
*   **Sync Server (Optional)**: A standard CouchDB instance for syncing data between devices.

### 2.2 Tech Stack
*   **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
*   **Language**: TypeScript
*   **Database**: [PouchDB](https://pouchdb.com/) (using `pouchdb-adapter-idb`)
*   **UI Library**: React 19, [Tailwind CSS](https://tailwindcss.com/)
*   **Charts**: Recharts
*   **PWA**: `@serwist/next` for Service Worker management.
*   **Reports**: Client-side generation using `jspdf` and `exceljs`.

---

## 3. Data Layer & Storage

### 3.1 PouchDB Configuration
The application uses **PouchDB** to interact with the browser's IndexedDB. This provides a NoSQL-like document store with built-in synchronization capabilities.

**File**: `frontend/lib/pouchdb.ts`
- **Databases**:
    - `accounts`: Bank accounts, wallets.
    - `transactions`: All financial records.
    - `categories`: Expense/Income categories (with sub-categories).
    - `creditcards`: Credit card management and statements.
    - `loans`: Loan tracking and EMI schedules.
    - `budgets`: Budget planning.
    - `shared`: For shared household data (if applicable).

### 3.2 Service Layer
A dedicated service layer abstracts direct PouchDB calls, providing a clean API for the UI components.

**File**: `frontend/lib/localdb-services.ts`
- **Pattern**: Singleton service objects (e.g., `transactionService`, `accountService`).
- **Responsibilities**:
    - CRUD operations.
    - Business logic hooks (e.g., updating account balance when a transaction is added).
    - Data aggregation for specific views.

### 3.3 Data Synchronization (Optional)
The app supports replicating local PouchDB data to a remote CouchDB instance. This is configured via environment variables or user settings, allowing multi-device access.

---

## 4. Business Logic & Features

### 4.1 Transactions
- **Types**: Income, Expense, Transfer between accounts.
- **Logic**:
    - Creating a transaction automatically updates the linked `Account` balance or `CreditCard` outstanding amount.
    - Deleting/Editing a transaction reverses the impact on the balance and applies the new value.
- **Sub-Categories**: Transactions can specific a `subCategoryId` for granular tracking.

### 4.2 Categories
- **Structure**: Categories can have an array of `subCategories`.
- **Types**: Income or Expense.
- **Validation**: Prevents deleting categories that are in use (logic handled in UI/Service).

### 4.3 Credit Cards
- **Billing Cycle**: Tracks `billingCycle` (start day) and `paymentDueDay`.
- **Statements**: Can generate statements based on billing cycles, calculating `closingBalance` and `minimumDue` (5% of outstanding).
- **Logic**: Expense transactions increase outstanding; Income (Payment) transactions decrease it.

### 4.4 Loans
- **EMI Calculation**: Client-side calculation of Equated Monthly Installments based on Principal, Rate, and Tenure.
- **Tracking**: Tracks `outstandingPrincipal`.
- **Logic**: Initial paid EMIs can be recorded to set the starting state of an existing loan.

### 4.5 Budgets
- **Modes**:
    - `EVENT`: One-time specific event (e.g., "Wedding", "Vacation").
    - `RECURRING`: Monthly/Periodic budgets.
    - `CATEGORY`: Logic for per-category limits.
- **Plan Items**: Detailed breakdown of planned expenses within a budget.

### 4.6 Analytics & Reports
**File**: `frontend/lib/analytics.ts`
- **Client-Side Processing**: All charts and summaries are calculated in the browser by iterating over PouchDB data.
- **Features**:
    - Monthly Breakdown (Pie Charts).
    - Sub-category drill-down.
    - Income vs Expense Trends.
    - Net Worth tracking.

---

## 5. Data Model Schema (Types)

**File**: `frontend/lib/db-types.ts`

### Account
```typescript
interface Account {
  id: string;
  name: string;
  type: string; // CHECKING, SAVINGS, CASH
  balance: number;
  currency: string;
  householdId: string;
  isArchived?: boolean;
}
```

### Transaction
```typescript
interface Transaction {
  id: string;
  amount: number;
  type: string; // INCOME, EXPENSE, TRANSFER
  date: string; // ISO String
  categoryId?: string;
  subCategoryId?: string; // Optional sub-category
  accountId: string;
  description?: string;
  householdId: string;
}
```

### Category
```typescript
interface Category {
  id: string;
  name: string;
  type: string;
  subCategories?: { id: string; name: string }[];
  icon?: string;
  color?: string;
}
```

### CreditCard
```typescript
interface CreditCard {
  id: string;
  name: string;
  creditLimit?: number;
  currentOutstanding?: number;
  billingCycle?: number; // Day of month
  paymentDueDay?: number; // Day of month
  statements?: CreditCardStatement[];
}
```

---

## 6. Directory Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── analytics/          # Analytics Dashboard
│   ├── accounts/           # Account Management
│   ├── budgets/            # Budget Planning
│   └── ...
├── components/             # Reusable UI Components
│   ├── ui/                 # Shadcn/Base UI elements
│   └── ...
├── lib/                    # Core Logic
│   ├── pouchdb.ts          # DB Initialization
│   ├── localdb-services.ts # Service Layer
│   ├── db-types.ts         # TypeScript Interfaces
│   └── analytics.ts        # Calculation Logic
├── public/                 # Static Assets
└── ...
```

## 7. Setup & Deployment

The application is containerized using Docker.

**Infrastructure**:
- **Frontend Container**: Node.js serving the Next.js app.
- **Nginx**: Reverse proxy for routing and SSL (if needed).
- **CouchDB (External)**: Use an external service or a separate container for sync.

**Running Locally**:
```bash
cd frontend
npm install
npm run dev
```

**Building for Production**:
```bash
npm run build
npm start
```
