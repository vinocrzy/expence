# PocketTogether

A lightweight, scalable, fully-dockerized web PWA for tracking personal & shared finances.

## Architecture

- **Frontend**: Next.js 14, Tailwind CSS, TypeScript.
- **Backend**: Fastify, TypeScript, Prisma, Swagger.
- **Database**: PostgreSQL.
- **Cache/Queue**: Redis.

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local logic without Docker)

### Running Locally (Docker)

1. Clone the repo.
2. Run:
   ```bash
   docker-compose up --build
   ```
3. Access:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:4000](http://localhost:4000)
   - API Docs: [http://localhost:4000/documentation](http://localhost:4000/documentation)

### Development

#### Backend
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Structure
- `/backend` - Fastify API
- `/frontend` - Next.js App
- `docker-compose.yml` - Orchestration
