# PocketTogether 💰

**A Smart, Offline-First Personal Finance PWA.**

PocketTogether is a modern expense tracking application built for speed, reliability, and privacy. It features a hybrid architecture that combines the performance of a local-first PWA with the security of a self-hosted backend.

---

## ✨ Key Features

- **📱 Offline-First PWA**: Works completely offline using IndexedDB and a custom sync engine. Queue transactions and sync when you're back online.
- **🤖 Smart Categorization**: "AI" powered category suggestions. Type "Uber" and it suggests "Transport". 
- **⚡ Hybrid Architecture**: 
  - **Frontend**: Deployed on **Netlify** (Global CDN) for instant loads.
  - **Backend**: Self-hosted (Reference Architecture: Home Server / VPS) exposed securely via **Cloudflare Tunnel**.
- **📊 Event Budgets**: Create temporary budgets for trips or events (e.g., "Paris Trip") and track spending against them.
- **💳 Multi-Asset Tracking**: Track Bank Accounts, Credit Cards, and Loans (EMIs).
- **🔒 Secure**: JWT Authentication, HttpOnly cookies, and strict CORS policies.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4, Framer Motion (Animations)
- **State/Sync**: React Context + IndexedDB (Local Database)
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 18+ (Fastify)
- **Database**: PostgreSQL (Prisma ORM)
- **Docs**: Swagger / OpenAPI
- **Security**: Helmet, Rate Limiting, CORS

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Hosting**: Hybrid (Netlify Frontend + Self-Hosted Backend)
- **Tunneling**: Cloudflare Tunnel (Zero Trust)

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
