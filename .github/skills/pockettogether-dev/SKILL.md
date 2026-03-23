---
name: pockettogether-dev
description: "Development skill for PocketTogether — a Local-First Personal Finance PWA. Use when: adding features (transactions, accounts, budgets, credit cards, loans, analytics, reports), fixing UI components, working with PouchDB services, implementing design system changes (Dark Glass, glassmorphism, gradients), adding pages to the Next.js App Router, working with PWA/service worker, encryption, or backup logic."
argument-hint: "Describe the feature or fix you want to implement"
---

# PocketTogether Development Skill

## Project Identity

**PocketTogether** is a Local-First, Offline-First Personal Finance PWA.
- **Core Philosophy**: Data lives on the user's device. Zero-latency operations. Works 100% offline.
- **Visual Metaphor**: "The Cockpit" — dark, focused, with glowing gradient instruments.
- **Design Language**: "Dark Glass" — glassmorphism on pure-black backgrounds.

---

## Quick Reference

| Topic | File |
|-------|------|
| Architecture & tech stack | [./references/architecture.md](./references/architecture.md) |
| Design system rules | [./references/design-system.md](./references/design-system.md) |
| Data models & service APIs | [./references/data-models.md](./references/data-models.md) |

---

## Tech Stack (At a Glance)

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Local DB**: PouchDB + `pouchdb-adapter-idb` (IndexedDB)
- **Auth**: Clerk (`@clerk/nextjs`)
- **Styling**: Tailwind CSS v4, Framer Motion (`framer-motion`)
- **Icons**: `lucide-react` (stroke-width: 2, standard size: `w-5 h-5`)
- **Charts**: `recharts`
- **Reports**: `jspdf` + `jspdf-autotable` (PDF), `exceljs` (Excel) — generated client-side
- **PWA**: `@serwist/next` for service worker
- **Encryption**: Web Crypto API — AES-256-GCM, PBKDF2 key derivation
- **Dev server**: `next dev -p 3010 --webpack`
- **Build**: `next build --webpack` (forced Webpack for PouchDB compatibility)

---

## Development Procedures

### Adding a New Page/Route

1. Create folder under `frontend/app/<route>/` with a `page.tsx`.
2. Use the existing page structure: server component wrapper + client components.
3. Load data from PouchDB services (see [data-models.md](./references/data-models.md)), never from a REST API for local data.
4. Apply the `NativeHeader` component at the top; **no double headers on mobile**.
5. Wrap animations with `framer-motion` using `fadeInUp` + `staggerContainer` from `frontend/lib/motion.ts`.

### Adding a New Feature to an Existing Module

1. Read `frontend/lib/db-types.ts` for the relevant TypeScript interfaces.
2. Read `frontend/lib/localdb-services.ts` for the service singleton pattern.
3. Add new methods to the existing service object — do not create new singleton files for minor extensions.
4. Update the PouchDB database index/schema in `frontend/lib/pouchdb.ts` if adding new document fields.
5. Build the UI component following [design-system.md](./references/design-system.md) rules.
6. If a modal is needed, follow the pattern of existing modals (e.g., `TransactionModal.tsx`, `LoanModal.tsx`).

### Fixing a UI/Design Bug

1. Check [design-system.md](./references/design-system.md) for the correct token.
2. **Primary background**: Always `#000000` — never `bg-gray-900`.
3. **Surface/card**: `bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl`.
4. **Gradients**: Primary brand is `from-blue-500 to-purple-600`; secondary is `from-cyan-500 to-blue-500`. Never use pink (`to-pink-600`) for primary actions.
5. **Inputs**: Use `bg-white/5 border-white/10` — not `bg-gray-900 border-gray-700`.
6. **Buttons**: Primary = `from-blue-500 to-purple-600` gradient.

### Working with the Data Layer

1. All data operations go through service singletons in `frontend/lib/localdb-services.ts`.
2. Transactions automatically update the linked Account balance or CreditCard outstanding — never update balances manually in the UI.
3. For analytics/aggregation, see `frontend/lib/analytics.ts` and `frontend/lib/insights-logic.ts`.
4. Never call a backend API for local-data operations — the local PouchDB is the source of truth.

### Adding Reports

1. Use `jspdf` for PDF and `exceljs` for Excel.
2. Place report logic in `frontend/lib/reports/`.
3. Export hook is in `frontend/hooks/useReportExport.ts`.
4. All data must come from local PouchDB — never fetch from a server for report generation.

### PWA / Service Worker

1. Service worker logic: `frontend/app/sw.ts` (Serwist-based), public SW: `frontend/public/sw.js`.
2. Use `frontend/hooks/useServiceWorker.ts` to interact with the SW from components.
3. Do not break offline capability — all UI paths must degrade gracefully without network.

---

## Key Patterns to Follow

- **No API calls for local data** — all CRUD goes through PouchDB service layer.
- **Reactive UI** — subscribe to PouchDB changes; never poll.
- **Glass card styling** on every widget/container (see design system reference).
- **Framer Motion** for all transitions — use `motion.ts` presets, not one-off configs.
- **Lucide icons** for all iconography — no other icon libraries.
- **`font-mono`** for all currency and number display.
- **Clerk auth** for user identity — use `useUser()` and `useAuth()` from `@clerk/nextjs`.

---

## Anti-Patterns (Do NOT Do)

- ❌ Using `bg-gray-900` as a background — use `#000000` or `bg-[#1c1c1e]`.
- ❌ Solid cards without glass effect (no backdrop-blur or border-white/5).
- ❌ Pink gradients (`to-pink-600`) on primary CTA buttons.
- ❌ Fetching data from a REST endpoint for local CRUD operations.
- ❌ Updating account balances directly — always go through the transaction service.
- ❌ Importing from `dexie` directly — use the PouchDB service layer in this project.
- ❌ Adding `rounded-xl` to large containers — use `rounded-3xl` for containers, `rounded-2xl` for inner items.
- ❌ Using `next export` for pages that use Clerk or dynamic routes.
