# CreatorOS AI

A production-grade creator intelligence platform — analytics, AI agents, competitor tracking, content planning, and team collaboration for content creators.

## How to run

Two workflows start automatically:

| Workflow | Command | Port |
|---|---|---|
| `api-server` | `PORT=3001 npm --prefix backend run dev` | 3001 |
| `frontend: web` | `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/creator-os run dev` | 5173 |

The frontend proxies `/api` requests to the backend on port 3001.

## First-time setup

Dependencies must be installed before starting:

```bash
pnpm install          # workspace + frontend deps
cd backend && npm install   # backend deps
```

## Stack

- **Frontend:** React 19, Vite 7, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Wouter, Recharts, Framer Motion
- **Backend:** Node.js 18+, Express 4, MongoDB (Mongoose — auto in-memory in dev), Redis/ioredis (optional — queues/cache degrade gracefully without it), BullMQ, JWT, Helmet, Winston/Pino
- **AI:** Google Gemini, OpenAI (configurable provider), multi-agent orchestration

## Key environment variables (backend)

| Variable | Required | Notes |
|---|---|---|
| `JWT_SECRET` | Yes (prod) | Dev default used otherwise |
| `JWT_REFRESH_SECRET` | Yes (prod) | Dev default used otherwise |
| `MONGODB_URI` | No | Omit to use auto in-memory MongoDB |
| `REDIS_HOST` | No | Defaults to 127.0.0.1; Redis is optional |
| `GEMINI_API_KEY` | No | Enables AI features |
| `ENCRYPTION_KEY` | Prod | 64-char hex; AES-256-GCM for OAuth tokens |

See `backend/.env.example` for the full list.

## Project structure

```
CreatorOS-AI/
├── frontend/          # React + Vite dashboard
├── backend/           # Node.js + Express REST API
│   └── src/           # Source — modules/<domain>/ layout
├── lib/               # Shared workspace libraries
│   ├── api-client-react/   # React Query hooks (OpenAPI-generated)
│   ├── api-spec/           # OpenAPI specification
│   ├── api-zod/            # Zod validation schemas
│   └── db/                 # Shared database utilities
└── docs/              # API reference, architecture, deployment, security
```

## Tests

```bash
cd backend && npm test   # 616 tests
```

## API docs

Swagger UI is served at `/api/v1/docs` when the backend is running.

## User preferences
