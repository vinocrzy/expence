# PocketTogether — Copilot Instructions

## Project Overview

**PocketTogether** is a Local-First, Offline-First Personal Finance PWA.
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Local DB**: PouchDB (IndexedDB via `pouchdb-adapter-idb`) — the single source of truth
- **Auth**: Clerk (`@clerk/nextjs`)
- **Styling**: Tailwind CSS v4, Framer Motion
- **PWA**: `@serwist/next`

> For full development procedures, design rules, and data model references, load the `pockettogether-dev` skill.

---

## Architecture Rules (Always Apply)

- **No REST calls for local data.** All CRUD goes through service singletons in `frontend/lib/localdb-services.ts`. The backend is optional backup only.
- **All documents are scoped by `householdId`.** Every query must filter by it.
- **Transactions have side effects.** `transactionService.create/update/delete` automatically maintains `Account.balance` and `CreditCard.outstanding`. Never update balances directly in the UI.
- **Build must use `--webpack`**: `next dev -p 3010 --webpack` / `next build --webpack` (required for PouchDB compatibility).
- **All features must work offline.** Never gate core UI on network availability.

---

## Design System Rules (Always Apply)

| Rule | Correct | Wrong |
|------|---------|-------|
| Page background | `bg-black` / `#000000` | `bg-gray-900` |
| Card / surface | `bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl` | Solid `bg-[#18181b]` without blur |
| Primary gradient | `from-blue-500 to-purple-600` | `from-purple-600 to-pink-600` |
| Inputs | `bg-white/5 border-white/10` | `bg-gray-900 border-gray-700` |
| Modals | `bg-[#1c1c1e]` | `bg-gray-800` |
| Currency/numbers | `font-mono` | `font-sans` |
| Icons | `lucide-react` only, `w-5 h-5`, stroke-width 2 | Any other icon library |
| Container radius | `rounded-3xl` (outer), `rounded-2xl` (inner) | `rounded-xl` on large containers |

---

## Key File Map

| What | Where |
|------|-------|
| TypeScript interfaces | `frontend/lib/db-types.ts` |
| Service layer (CRUD) | `frontend/lib/localdb-services.ts` |
| PouchDB setup & schemas | `frontend/lib/pouchdb.ts` |
| Analytics calculations | `frontend/lib/analytics.ts` |
| EMI / financial math | `frontend/lib/financial-math.ts` |
| Encryption (AES-256-GCM) | `frontend/lib/encryption.ts` |
| Framer Motion presets | `frontend/lib/motion.ts` |
| Report generators | `frontend/lib/reports/` |
| Service worker source | `frontend/app/sw.ts` |
