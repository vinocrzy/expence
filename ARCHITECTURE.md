# Architecture Documentation

## Overview
This application is a **Local-First**, **Serverless** Personal Finance Manager (PWA). 
It is designed to run entirely in the browser, using **IndexedDB** (via RxDB) for data persistence. 
Data is synced between devices using a CouchDB-compatible backend (optional) or purely local usage.

## Key Changes from Legacy Architecture
- **Backend Removed**: The Node.js/Express backend has been completely removed.
- **PostgreSQL Removed**: The relational database dependency is gone. 
- **Serverless Reports**: PDF and Excel reports are generated client-side using `jspdf` and `exceljs`.

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **State/DB**: RxDB (Reactive Database) over Dexie.js (IndexedDB)
- **UI Library**: Tailwind CSS, Shadcn UI
- **PWA**: Using `@serwist/next` for service worker management and offline capabilities.
- **Build Tool**: Webpack (forced via `next.config` or build flags due to library compatibility).

### Infrastructure (Docker)
The application is containerized for easy deployment.
- **Frontend Container**: Node.js container hosting the Next.js standalone server.
- **Reverse Proxy**: Nginx container handling traffic, SSL termination (in prod), or simple routing.
- **Tunnel (Optional)**: Cloudflare Tunnel for secure public access without opening ports.

## Data Flow
1. **User Action**: User adds a transaction.
2. **Local DB**: Data is written instantly to `RxDB` (IndexedDB) in the browser.
3. **UI Update**: RxDB observes changes and updates the React UI immediately.
4. **Sync (Optional)**: If configured, RxDB syncs changes to a remote CouchDB instance.

## Report Generation
Reports are generated 100% on the client.
- **Format**: PDF (`jspdf`) and Excel (`exceljs`).
- **Process**: 
  1. Frontend fetches raw data from local RxDB.
  2. Aggregates data in memory (e.g., sums, grouping).
  3. Generates the binary blob.
  4. Triggers browser download.

## Deployment
Running the app with Docker:
```bash
docker-compose up -d --build
```
This starts:
1. `frontend` (Port 3000)
2. `reverse-proxy` (Port 80)
3. `tunnel` (Cloudflare)

## Directory Structure
- `frontend/`: Next.js application
  - `lib/reports/`: Client-side report generation logic
  - `lib/localdb-services.ts`: Database operational layer
  - `schema.ts`: RxDB schemas
- `nginx/`: Nginx configuration
- `docker-compose.yml`: Service definition
