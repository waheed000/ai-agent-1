# CreatorOS

A SaaS creator intelligence platform with a React dashboard frontend and Express API backend.

## Project Structure

This is a pnpm monorepo (`pnpm-workspace.yaml`) with the following packages:

- **`artifacts/creator-os`** — React + Vite frontend dashboard (Tailwind, shadcn/ui, Wouter, TanStack Query)
- **`artifacts/api-server`** — TypeScript/Express API backend (pino logging, esbuild bundled)
- **`backend/`** — Full-featured Node.js/Express/MongoDB/Redis backend (AI agents, OAuth, BullMQ queues, 600+ tests). Not currently wired into the Replit workflow.
- **`lib/`** — Shared libraries (db, api-zod schemas, etc.)

## How to Run

Both services start automatically via the **Project** workflow (run button):

| Service | Port | Workflow name |
|---------|------|---------------|
| Frontend (creator-os) | 5173 | `creator-os` |
| API server | 8080 | `api-server` |

The frontend proxies `/api` requests to `http://localhost:8080`.

## Key Commands

```bash
# Install dependencies (from workspace root)
pnpm install

# Run a specific package
pnpm --filter @workspace/creator-os run dev
pnpm --filter @workspace/api-server run dev

# Typecheck everything
pnpm run typecheck
```

## Backend Notes

The `backend/` directory has a separate, more fully-featured backend with MongoDB, Redis, and BullMQ. It is not connected to the Replit workflows — it would need MongoDB and Redis services plus environment variables (`JWT_SECRET`, `MONGODB_URI`, `REDIS_HOST`, etc.) to run. See `backend/.env.example` for the full list.

## User Preferences

<!-- Add remembered preferences here -->
