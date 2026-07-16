# CreatorOS AI

A SaaS dashboard for content creators — analytics, AI insights, content strategy, competitor intelligence, and trend discovery across social platforms.

## Run & Operate

- `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/creator-os run dev` — React frontend (port 5173)
- `PORT=8080 pnpm --filter @workspace/api-server run dev` — TypeScript API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — auto-provided by Replit's managed PostgreSQL

## Workflows (Replit)

- **creator-os** — serves the React frontend on port 5173 (webview)
- **api-server** — serves the Express API on port 8080 (console)

The frontend Vite dev server proxies `/api/*` requests to `http://localhost:8080`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS v4, shadcn/ui, Wouter, TanStack React Query
- API: Express 5 (TypeScript, esbuild bundle)
- DB: PostgreSQL + Drizzle ORM (schema in `lib/db/src/schema/`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from `lib/api-spec/openapi.yaml`)
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/creator-os/` — React SaaS dashboard frontend
- `artifacts/api-server/` — Express API server (mock data; DB schema empty, ready to build out)
- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks (don't edit directly)
- `lib/api-zod/src/generated/` — generated Zod schemas (don't edit directly)
- `lib/db/src/schema/` — Drizzle table definitions
- `backend/` — legacy JS/MongoDB backend (not used; ignore)

## Architecture decisions

- All API routes currently return mock data. The DB schema (`lib/db/`) is empty — ready to define tables and wire routes to real data.
- Orval codegen derives React Query hooks from the OpenAPI spec. Run codegen after editing the spec; never hand-edit generated files.
- Vite proxies `/api` to localhost:8080 in dev so the frontend and API run as separate processes without CORS issues.
- The `backend/` directory is a legacy standalone JS server that is not part of the pnpm workspace and should be ignored.

## Product

CreatorOS AI is an all-in-one dashboard for content creators:
- **Dashboard** — follower growth, reach, engagement, impressions, AI-generated weekly summary
- **Analytics** — platform-by-platform performance breakdown
- **AI Insights** — trend recommendations and content suggestions
- **Content Strategy** — content calendar and scheduling
- **Competitors** — competitor tracking and benchmarking
- **Trends** — trend discovery across platforms
- **Reports** — exportable growth reports

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run codegen (`pnpm --filter @workspace/api-spec run codegen`) after any change to `lib/api-spec/openapi.yaml`.
- The `backend/` directory is not in the pnpm workspace — its deps are not installed by `pnpm install`.
- `DATABASE_URL` is runtime-managed by Replit; never set it manually.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
