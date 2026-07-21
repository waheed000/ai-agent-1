# CreatorOS AI

A production-grade creator intelligence platform — analytics, AI agents, competitor tracking, content planning, and team collaboration for content creators.

## Project Structure

```
CreatorOS-AI/
├── frontend/          # React + Vite dashboard (TypeScript, Tailwind, shadcn/ui)
├── backend/           # Node.js + Express REST API (MongoDB, Redis, BullMQ)
├── lib/               # Shared workspace libraries
│   ├── api-client-react/   # React Query hooks
│   ├── api-spec/           # OpenAPI specification
│   ├── api-zod/            # Zod validation schemas
│   └── db/                 # Shared database utilities
├── docs/              # API reference, architecture, deployment, security
└── artifacts/         # Replit platform artifacts (api-server stub, mockup sandbox)
```

## How to Run (Replit)

Two workflows start automatically when you press Run:

| Workflow | Command | Port | Notes |
|---|---|---|---|
| `frontend: web` | `pnpm --filter @workspace/creator-os run dev` | 5173 | React + Vite dashboard |
| `api-server` | `npm --prefix backend run dev` | 8080 | Node.js/Express REST API |

The frontend proxies all `/api` requests to the backend on port 8080.  
In dev, the backend uses **in-memory MongoDB** (no external DB needed). Redis is optional and degrades gracefully.

## Backend

The production backend lives in `backend/`. It is a standalone npm project (not a pnpm workspace package) with its own `node_modules`.

```bash
cd backend
npm install   # first time only
npm run dev   # starts on port 8080 (set by the Replit workflow)
npm test      # runs 616 tests
```

Key env vars (see `backend/.env.example`):

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Prod | MongoDB connection string (auto in-memory in dev) |
| `JWT_SECRET` | Yes | Access token signing key (≥64 chars in prod) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing key |
| `REDIS_HOST` | No | Redis host (default `127.0.0.1`) |
| `GEMINI_API_KEY` | No | Google Gemini for AI features |

## Frontend

React 19 + Vite 7 SPA in `frontend/`. Part of the pnpm workspace.

```bash
pnpm install                                          # workspace root
pnpm --filter @workspace/creator-os run dev           # or use the Replit workflow
```

The frontend proxies `/api` → `http://localhost:8080`.

## Documentation

| Doc | Description |
|---|---|
| [`docs/API.md`](docs/API.md) | Full API endpoint reference |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture overview |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deployment guide |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | Contribution guidelines |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Security policies |

## User Preferences

<!-- Add remembered preferences here -->
