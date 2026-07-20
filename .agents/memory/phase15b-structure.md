---
name: Phase 15B Production Engineering
description: Files created/changed and key decisions for Phase 15B (structured logging, request tracing, security, cache, metrics, health endpoints).
---

# Phase 15B — Production Engineering

## New files

- `backend/src/utils/logger.js` — Replaced simple console logger with structured JSON logger using AsyncLocalStorage for request context propagation. Exports `requestContext` (AsyncLocalStorage) and `logger.child(fields)`.
- `backend/src/shared/middleware/requestTrace.js` — Generates `requestId` (UUID) + `correlationId` (echoed from X-Correlation-ID header or generated). Runs the middleware chain inside `requestContext.run()`. Exports `enrichRequestContext(req)` and `enrichWorkspaceContext(id)` for post-auth enrichment.
- `backend/src/shared/middleware/securityMiddleware.js` — Four guards: `noSqlInjection` (strips `$` keys), `prototypePollution` (rejects `__proto__`/`constructor`/`prototype`), `hpp()` (collapses duplicate query params), `massAssignment()` (opt-in — NOT applied globally).
- `backend/src/infrastructure/metrics/index.js` — In-process MetricsService: HTTP requests, response time histograms, AI calls, queue jobs, cache hit rate, memory/CPU snapshots. Call `MetricsService.getSnapshot()`.
- `backend/src/tests/phase15b.test.js` — 59 tests covering all 15B areas.

## Modified files

- `backend/src/app.js` — Added `requestTrace` (first), `helmet` (hardened config), CORS `exposedHeaders`, `hpp()`, body parsers, then `prototypePollution` + `noSqlInjection`. `massAssignment` removed from global chain.
- `backend/src/modules/health/health.routes.js` — Replaced simple `/health` with 5 endpoints: `/health`, `/health/live`, `/health/ready`, `/health/dependencies`, `/health/metrics`.
- `backend/src/infrastructure/cache/index.js` — Added stats (`_stats`, `getStats()`), `clearDomain()`, `wrap()`, and 5 domain helpers: `getAnalytics`, `getReport`, `getPlanner`, `getCompetitor`, `getSearch` plus their `invalidate*` counterparts.
- `backend/src/ai/MemoryService.js` — Added `MetricsService.recordAiCall()` on success and error.
- `backend/src/shared/middleware/authenticate.js` — Calls `enrichRequestContext(req)` after `req.user` is set.

## Key decisions

**Why `massAssignment` is NOT global:** Each route already has express-validator guards that reject unknown/privileged fields with 400. Applying `massAssignment` globally silently strips those fields before validators run, causing tests that expect 400 to get 200. Keep `massAssignment` as an exported opt-in middleware for routes without their own field-level validation.

**Why `noSqlInjection` null-handling matters:** `stripMongoOperators({ $gt: '' })` returns `null` (operator-only → absent field). But `req.query` and `req.params` always get `?? {}` fallback so controller destructuring (`const { platform } = req.query`) never crashes on empty or stripped queries.

**Why requestTrace must be first:** All subsequent middleware and handlers run inside `requestContext.run()`, so structured logger automatically includes `requestId`/`correlationId` in every log line without any extra plumbing.

**Why `prototypePollution` runs AFTER `express.json()`:** The check inspects `req.body`, which is only populated after body parsing. Placing it before body parsers meant it always saw an empty body and never blocked anything.
