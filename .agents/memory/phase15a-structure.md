---
name: Phase 15A backend structure
description: Enterprise folder layout for the CreatorOS AI backend after Phase 15A refactor.
---

# Phase 15A Backend Structure

## New Layout (backend/src/)

- `config/` — centralized env validation (no change)
- `infrastructure/` — database/, cache/, queue/ (moved from database/ and services/CacheService|QueueService)
- `providers/` — AIProvider, GeminiProvider, OpenAIProvider (moved from ai/providers/)
- `ai/` — orchestrator, agents, ContextBuilder, MemoryService (providers subdir removed)
- `events/` — no change
- `queues/` — scheduler, queues.js, workers/ (imports updated to infrastructure/)
- `shared/middleware/` — authenticate, errorHandler, notFound, rateLimiter (moved from middleware/)
- `modules/<domain>/` — 20 feature modules, each with controller, routes, service, repository, validators
- `models/` — no change
- `utils/` — no change
- `tests/` — no change (imports updated)
- `routes/index.js` imports from modules/

## Module list
account, analytics, apikeys, audit, auth, competitors, content, features, health,
integrations (+ oauth/), jobs, notifications, platforms (+ providers/), reports,
search, settings, strategy, trends, usage, workspaces

## Key rule
**Why:** Phase 15A was a pure structural refactor — no business logic changed, no API contracts changed.
**How to apply:** When adding new domain features, create a new module under modules/<domain>/ following the same pattern (controller, routes, service, repository, validators). Infrastructure (DB, cache, queue) lives in infrastructure/.
