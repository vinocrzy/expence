# PocketTogether 💰

**A Smart, Local-First Personal Finance PWA.**

PocketTogether is a modern expense tracking application built for speed, reliability, and privacy. It features a **local-first architecture** where your data lives on your device, with optional encrypted backups to the cloud.

---

## 🏠 Local-First Architecture

**NEW:** This app has been completely redesigned as a local-first application!

- **🏠 Data Lives Locally**: All data stored in your browser (IndexedDB via Dexie.js)
- **🌐 100% Offline**: Works without internet - no API calls for daily usage
- **⚡ Blazing Fast**: 10-20x faster than traditional client-server (5-20ms operations)
- **🔒 Privacy-First**: Your data never leaves your device unless you trigger backup
- **☁️ Optional Backup**: User-triggered encrypted backups to server
- **🔐 Zero-Knowledge**: Backend stores only encrypted blobs, never sees plain data

## ✨ Key Features

- **📱 Offline-First**: Works completely without internet connection
- **⚡ Instant Operations**: No loading spinners, everything is instant
- **🔐 Encrypted Backups**: Optional AES-256-GCM encrypted backups to server
- **📊 Event Budgets**: Create temporary budgets for trips or events (e.g., "Paris Trip")
- **💳 Multi-Asset Tracking**: Track Bank Accounts, Credit Cards, and Loans (EMIs)
- **📈 Local Analytics**: All calculations run in frontend (EMI, analytics, reports)
- **🔄 Migration Support**: One-time migration from existing backend data
- **🛡️ Resilient**: No server downtime, no network errors, data persists

## 🛠️ Tech Stack

### Frontend (Single Source of Truth)
- **Framework**: Next.js 16 (App Router)
- **Local Database**: Dexie.js (IndexedDB wrapper)
- **Styling**: Tailwind CSS v4, Framer Motion (Animations)
- **Encryption**: Web Crypto API (AES-256-GCM)
- **Business Logic**: Local calculations (EMI, analytics, reports)
- **Icons**: Lucide React

### Backend (Backup Only)
- **Runtime**: Node.js 18+ (Fastify)
- **Database**: PostgreSQL (Stores encrypted backup blobs only)
- **Purpose**: User authentication + encrypted backup storage
- **API**: 4 endpoints (backup, restore, history, delete)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Hosting**: Any static host (Netlify, Vercel, etc.) + minimal backend

---

## 🏗️ Architecture

```mermaid
graph TD
    User[User Device / PWA]
    
    subgraph Netlify Cloud
        Frontend[Next.js Frontend]
    end
    
    subgraph Home Server / VPS
        Tunnel[Cloudflare Tunnel]
        Nginx[Nginx Proxy]
        Backend[Fastify API]
        DB[(PostgreSQL)]
    end

    User -->|HTTPS| Frontend
    User -->|HTTPS / API Calls| Tunnel
    Frontend -->|Build Time| Tunnel
    
    Tunnel -->|Secure Connection| Nginx
    Nginx --> Backend
    Backend --> DB
```

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (Optional, for local dev)

### 1. Installation

Clone the repository:
```bash
git clone https://github.com/vinocrzy/expence.git
cd expence
```

### 2. Configuration (`.env`)

Create a `.env` file in `backend/` and `frontend/` (see `.env.example`).

**Backend (`backend/.env`):**
```env
DATABASE_URL="postgresql://user:pass@postgres:5432/expence?schema=public"
JWT_SECRET="supersecret"
PORT=4000
FRONTEND_URL="http://localhost:3000"
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL="http://localhost:4000" # For local dev
# OR for Production:
# NEXT_PUBLIC_API_URL="https://your-api-domain.com"
```

### 3. Run with Docker (Recommended)

Start the entire stack (Database, Backend, Frontend, Proxy):
```bash
docker-compose up -d --build
```

Access the app:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000](http://localhost:4000)
- **Swagger Docs**: [http://localhost:4000/documentation](http://localhost:4000/documentation)

### 4. Local Development (No Docker)

**Backend:**
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## ☁️ Deployment Guide

### Frontend (Netlify)
1.  Connect repo to Netlify.
2.  **Base Directory**: `frontend`
3.  **Build Command**: `npm run build`
4.  **Publish Directory**: `.next`
5.  **Environment Variables**:
    - `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `https://api.yourdomain.com`)

### Backend (Self-Hosted)
1.  Set up a server with Docker.
2.  Configure **Cloudflare Tunnel** to route traffic to `http://localhost:80` (Nginx) or `4000` (Backend).
3.  Set `CORS_ORIGIN` in backend to allow your Netlify URL.

---

## 📄 License

MIT
