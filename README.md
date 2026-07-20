# CreatorOS AI

A production-grade creator intelligence platform — analytics, AI agents, competitor tracking, content planning, and team collaboration for content creators.

## Structure

```
CreatorOS-AI/
├── frontend/          # React + Vite dashboard (TypeScript, Tailwind, shadcn/ui)
├── backend/           # Node.js + Express REST API (MongoDB, Redis, BullMQ)
├── lib/               # Shared workspace libraries
│   ├── api-client-react/   # React Query hooks generated from OpenAPI spec
│   ├── api-spec/           # OpenAPI specification
│   ├── api-zod/            # Zod validation schemas
│   └── db/                 # Shared database utilities
├── docs/              # API reference, architecture, deployment, security
└── artifacts/         # Replit platform artifacts (api-server stub, mockup sandbox)
```

## Quick Start

**Prerequisites:** Node.js ≥ 18, pnpm, MongoDB, Redis

```bash
# Install all workspace dependencies
pnpm install

# Start the backend (port 3000 by default)
cd backend && npm run dev

# Start the frontend (port 5173)
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/creator-os run dev
```

## Backend

The backend is a production-ready REST API. See [`backend/README.md`](backend/README.md) for full documentation.

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Prod | MongoDB connection string (in-memory in dev) |
| `JWT_SECRET` | Yes | Access token signing key (≥64 chars in prod) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing key |
| `REDIS_HOST` | No | Redis host (default `127.0.0.1`) |
| `GEMINI_API_KEY` | No | Google Gemini for AI features |

See [`backend/.env.example`](backend/.env.example) for the full list.

## Frontend

React 19 + Vite 7 SPA. Proxies `/api` requests to the backend.

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/creator-os run dev
```

## Documentation

| Doc | Description |
|---|---|
| [`docs/API.md`](docs/API.md) | Full API endpoint reference |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture overview |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deployment guide |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | Contribution guidelines |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Security policies |

## Tests

```bash
# Run backend test suite (616 tests)
cd backend && npm test
```

## Tech Stack

**Frontend:** React 19, Vite 7, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Wouter, Recharts, Framer Motion

**Backend:** Node.js 18+, Express 4, MongoDB (Mongoose), Redis (ioredis), BullMQ, JWT, Helmet, Winston/Pino

**AI:** Google Gemini, OpenAI (configurable provider), multi-agent orchestration
