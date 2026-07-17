# CreatorOS AI

A SaaS dashboard for content creators featuring growth analytics, AI recommendations, competitor tracking, trends, and content strategy.

## Stack

- **Frontend** (`artifacts/creator-os`): React 19 + Vite + Tailwind CSS v4 + shadcn/ui + Wouter (routing) + TanStack Query
- **API Server** (`artifacts/api-server`): TypeScript + Express 5 + Drizzle ORM — serves `/api` on port 8080
- **Backend (legacy)** (`backend/`): Node.js + Express + Mongoose + BullMQ + Redis — standalone, not wired into the monorepo workflows
- **Shared libraries** (`lib/`): `api-client-react`, `api-spec`, `api-zod`, `db`

## How to run

Both services start automatically via the configured workflows:

| Workflow | Command | Port |
|---|---|---|
| `creator-os` | `pnpm --filter @workspace/creator-os run dev` | 5173 |
| `api-server` | `pnpm --filter @workspace/api-server run dev` | 8080 |

The frontend proxies all `/api` requests to the api-server on port 8080.

## Package management

This is a **pnpm workspace** monorepo. Always use `pnpm` (not npm) for the workspace packages:

```bash
pnpm install                        # install all workspace deps
pnpm --filter @workspace/creator-os add <pkg>   # add to frontend
pnpm --filter @workspace/api-server add <pkg>   # add to api-server
```

The `backend/` folder uses plain npm and has its own `node_modules`.

## Environment

- No secrets required for development — JWT secrets and MongoDB URI have safe dev defaults
- Set `MONGODB_URI` env var to use a real MongoDB instance (omit to use in-memory)
- Set `REDIS_HOST` / `REDIS_PORT` for BullMQ job queues (optional in dev)

## User preferences

- Use in-memory MongoDB for local development
- Do not alter existing code structure unless explicitly asked
