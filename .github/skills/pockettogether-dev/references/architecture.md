# Architecture Reference

## Core Principle: Local-First

The frontend is the single source of truth. The backend (if present) is only used for:
1. User authentication (Clerk handles this externally)
2. Optional encrypted backup storage

**All CRUD operations use the local PouchDB — never a REST API for daily usage.**

---

## Directory Layout

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (providers, Clerk, Serwist)
│   ├── page.tsx            # Entry point / redirect
│   ├── accounts/           # Bank account management
│   ├── transactions/       # Transaction listing & entry
│   ├── budgets/            # Budget planning
│   ├── credit-cards/       # Credit card tracking
│   ├── loans/              # Loan/EMI tracking
│   ├── analytics/          # Charts and insights
│   ├── reports/            # PDF/Excel report generation
│   ├── recurring/          # Recurring transaction rules
│   ├── portfolio/          # Investment portfolio
│   ├── settings/           # App settings and backup
│   └── dashboard/          # Summary dashboard
├── components/             # Shared/reusable React components
│   ├── ui/                 # Primitive UI components
│   └── dashboard/          # Dashboard-specific widgets
├── context/
│   ├── AuthContext.tsx      # User/household context
│   ├── LocalFirstContext.tsx  # Local-first state (sync status, etc.)
│   └── ToastContext.tsx     # Global toast notifications
├── hooks/                  # Custom React hooks
├── lib/
│   ├── pouchdb.ts          # PouchDB database instances & schemas
│   ├── localdb-services.ts # Service singletons (CRUD + business logic)
│   ├── db-types.ts         # All TypeScript interfaces/types
│   ├── analytics.ts        # Client-side analytics calculations
│   ├── insights-logic.ts   # AI-style financial insights
│   ├── budget-engine.ts    # Budget calculation logic
│   ├── financial-math.ts   # EMI and financial formulas
│   ├── encryption.ts       # AES-256-GCM encryption (Web Crypto API)
│   ├── backup.ts           # Backup/restore orchestration
│   ├── replication.ts      # PouchDB → CouchDB sync logic
│   ├── reports/            # PDF and Excel report generators
│   └── motion.ts           # Framer Motion animation presets
├── public/
│   ├── sw.js               # Compiled service worker
│   └── manifest.json       # PWA manifest
└── app/sw.ts               # Service worker source (Serwist)
```

---

## Data Flow

```
User Action
    ↓
React Component
    ↓
Service Singleton (localdb-services.ts)
    ↓
PouchDB (IndexedDB in browser)
    ↓
PouchDB change event
    ↓
React UI re-renders reactively
```

Optional (if sync configured):
```
PouchDB ←→ CouchDB (via replication.ts)
```

---

## PouchDB Setup (`frontend/lib/pouchdb.ts`)

Named database instances:
| Instance | Collection |
|----------|------------|
| `accountsDb` | Bank accounts, wallets |
| `transactionsDb` | All financial records |
| `categoriesDb` | Expense/Income categories + sub-categories |
| `creditCardsDb` | Credit card metadata |
| `loansDb` | Loan records + EMI schedule |
| `budgetsDb` | Budget plans |
| `sharedDb` | Household shared data |

---

## Service Layer Pattern (`frontend/lib/localdb-services.ts`)

Services are **singleton objects** exported directly:

```typescript
export const transactionService = {
  async create(data: Omit<Transaction, 'id'>): Promise<Transaction> { ... },
  async update(id: string, data: Partial<Transaction>): Promise<Transaction> { ... },
  async delete(id: string): Promise<void> { ... },
  async getAll(householdId: string): Promise<Transaction[]> { ... },
  async getById(id: string): Promise<Transaction | null> { ... },
};
```

**Side-effect rules** (enforced only in service layer, never in UI):
- `transactionService.create` → updates linked `Account.balance` or `CreditCard.outstanding`
- `transactionService.delete` → reverses the balance impact before removing

---

## Authentication (Clerk)

- Provider: `@clerk/nextjs`
- User and session available via `useUser()` and `useAuth()` hooks
- Auth context wrapper in `frontend/context/AuthContext.tsx`
- Household ID derived from Clerk user metadata — all DB documents are scoped by `householdId`

---

## PWA & Offline

- Service worker powered by `@serwist/next`
- Source: `frontend/app/sw.ts` → compiled to `frontend/public/sw.js`
- Hook: `frontend/hooks/useServiceWorker.ts`
- **All features must work offline** — never gate core UI on network availability

---

## Encryption (Backup)

File: `frontend/lib/encryption.ts`

```typescript
// Encrypt data before upload
const encrypted = await encryptData(jsonString, userPassword);
// Decrypt after restore
const decrypted = await decryptData(encryptedBlob, userPassword);
```

- Algorithm: AES-256-GCM
- Key derivation: PBKDF2, 100,000 iterations, random salt
- Random IV per encryption
- Backend stores only the encrypted blob — zero-knowledge

---

## Infrastructure (Docker)

```yaml
# docker-compose.yml services:
frontend:    # Next.js standalone server on port 3000
nginx:       # Reverse proxy on port 80 (SSL termination in prod)
tunnel:      # Optional Cloudflare tunnel for public access
```

Build command: `docker-compose up -d --build`
