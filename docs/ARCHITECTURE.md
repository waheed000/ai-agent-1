# Architecture — CreatorOS AI Backend

## Overview

CreatorOS AI is a Node.js REST API built around three organizing principles:

1. **Feature-sliced modules** — each business domain owns its full vertical slice (routes → controller → service → repository).
2. **Infrastructure isolation** — database, cache, queue, and metrics are shared infrastructure, not business logic.
3. **Event-driven side effects** — cross-domain consequences (e.g. "send a notification when a report is ready") are handled by event listeners, not inline service calls.

---

## Request Lifecycle

```
Client
  │
  ▼
requestTrace            ← attaches requestId + correlationId (AsyncLocalStorage)
  │
  ▼
Helmet / CORS           ← security headers, cross-origin policy
  │
  ▼
hpp()                   ← collapse duplicate query params
  │
  ▼
compression             ← gzip response bodies
  │
  ▼
generalLimiter          ← IP-based rate limiting (100 req / 15 min)
  │
  ▼
MetricsService counter  ← lightweight HTTP request counter
  │
  ▼
express.json()          ← parse request body
  │
  ▼
prototypePollution      ← reject __proto__ / constructor / prototype
noSqlInjection          ← strip $ MongoDB operator keys
  │
  ▼
Router (apiRouter)
  │
  ├── authenticate       ← verify JWT, load user
  ├── authorize(role)    ← RBAC gate (admin / superadmin routes)
  ├── validators         ← express-validator chains
  └── Controller
        └── Service
              └── Repository → MongoDB
```

---

## Module Structure

Every business domain lives under `src/modules/<domain>/`:

```
<domain>/
├── <Domain>Controller.js     HTTP layer — parses request, calls service, formats response
├── <Domain>Service.js        Business logic — orchestrates repositories, emits events
├── <Domain>Repository.js     Data access — all Mongoose queries live here
├── <domain>.routes.js        Express router — HTTP method → controller action mapping
└── <domain>Validators.js     Input validation (express-validator)
```

**Strict layering rules:**
- Controllers never touch MongoDB directly.
- Services never import other services' repositories.
- Repositories never emit events or import services.
- Only controllers import HTTP utilities (`asyncHandler`, `sendSuccess`, `sendError`).

---

## AI Agent Architecture

```
AgentOrchestrator
  │
  ├── AgentRegistry            ← Maps agent names to classes
  │
  ├── ContextBuilder           ← Assembles user/workspace context for prompts
  │
  ├── MemoryService            ← Persists agent memory across requests (MongoDB)
  │
  ├── PromptBuilder            ← Constructs final prompts from templates + context
  │
  └── PromptTemplates          ← Domain-specific prompt templates
        │
        ├── AnalyticsAgent     ← Interprets analytics data, generates insights
        ├── ContentAgent       ← Generates content ideas and plans
        ├── CompetitorAgent    ← Analyses competitor profiles
        ├── GrowthCoachAgent   ← Produces growth strategies
        └── TrendAgent         ← Identifies and summarizes trends
```

### Agent execution flow

1. A queue worker (e.g. `reportWorker`) receives a job.
2. The worker calls `AgentOrchestrator.run(agentName, context)`.
3. The orchestrator fetches agent memory from `MemoryService`, builds a prompt via `PromptBuilder`, and calls the configured AI provider (Gemini or OpenAI).
4. The response is stored, memory is updated, and a domain event is emitted (e.g. `AI_REPORT_GENERATED`).
5. An event listener creates the `Report` document and dispatches an in-app notification.

### Provider failover

`AgentOrchestrator` supports multiple providers. If the primary provider fails, it retries with the fallback. Provider selection is controlled by `AI_DEFAULT_PROVIDER` and the presence of API keys.

---

## Queue System (BullMQ)

All CPU-intensive or externally-dependent work runs asynchronously through BullMQ queues backed by Redis.

```
Queues
  ├── analytics     ← Scheduled follower/engagement syncs
  ├── report        ← AI report generation
  ├── planner       ← AI content plan generation
  ├── trend         ← Platform trend refresh
  ├── socialSync    ← OAuth platform data sync
  └── notification  ← Notification delivery
```

### Retry policy

Each job retries up to `QUEUE_DEFAULT_ATTEMPTS` times (default 3) with exponential backoff between `QUEUE_RETRY_BASE_MS` (1 s) and `QUEUE_RETRY_MAX_MS` (30 s).

### Scheduler

`src/queues/scheduler.js` registers repeating jobs on application startup:
- Analytics sync: every 6 hours
- Trend refresh: every 2 hours
- Weekly digest reports: Mondays at 08:00

---

## Event Bus

`src/events/eventBus.js` wraps Node.js `EventEmitter` with typed events and error isolation.

```
Event types (src/events/eventTypes.js):
  ANALYTICS_COMPLETED
  AI_REPORT_GENERATED
  COMPETITOR_UPDATED
  GROWTH_PLAN_GENERATED
  MEMBER_INVITED
  NOTIFICATION_CREATED
  PLATFORM_SYNCED
  PLANNER_GENERATED
  REPORT_GENERATED
  SETTINGS_UPDATED
  STRATEGY_GENERATED
  TREND_UPDATED
  USAGE_RECORDED
  WORKSPACE_CREATED
  WORKSPACE_DELETED
  WORKSPACE_UPDATED
  API_KEY_CREATED
  API_KEY_REVOKED
```

Listeners under `src/events/listeners/` subscribe to events and handle side effects in isolation. Listener errors are caught and logged — they never propagate back to the request that triggered the event.

---

## Repository Pattern

Repositories encapsulate all MongoDB queries. They are plain classes (no base class), each scoped to a single Mongoose model.

Conventions:
- Method names reflect intent: `findByUser`, `countByWorkspace`, `upsertLatest`.
- Repositories never contain business logic or emit events.
- Lean queries (`.lean()`) are used for read-only result sets to skip Mongoose hydration overhead.
- All list methods accept `{ page, limit }` and return `{ data, total, page, limit }`.

---

## Caching (Redis)

`src/infrastructure/cache/index.js` provides a `CacheService` singleton.

```
Namespaces and TTLs (configurable via environment variables):
  analytics   3600 s  (1 hour)
  trends      1800 s  (30 min)
  competitors 1800 s  (30 min)
  ai          86400 s (24 hours)
  general     300 s   (5 min)
```

Key pattern: `<namespace>:<user_or_workspace_id>:<discriminator>`

**Cache helpers:** `CacheService.wrap(namespace, key, fn, opts)` fetches from cache or executes `fn`, stores the result, and returns it. It includes a stale-on-error fallback: if the compute function throws, the last-known cached value is returned instead of propagating the error.

**Domain helpers:** `CacheService.getAnalytics(userId, params)`, `getReport(...)`, `getPlanner(...)`, `getCompetitor(...)`, `getSearch(...)` and matching `invalidate*` methods are provided for the most common access patterns.

---

## Security

See [SECURITY.md](SECURITY.md) for the full security architecture.

In brief:

- **Authentication:** RS256-signed JWTs (access token 15 min, refresh token 7 days stored in `httpOnly` cookie and hashed in MongoDB).
- **Authorization:** RBAC — `user`, `admin`, `superadmin` roles enforced at the route level via `authorize(role)` middleware.
- **Transport:** Helmet sets HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers.
- **Input hardening:** `prototypePollution` guard, `noSqlInjection` guard (strips `$` operator keys), and `express-validator` on every route.
- **Encryption:** OAuth tokens are encrypted with AES-256-GCM before storage.
- **Rate limiting:** Three tiers — general (100/15 min), auth (10/15 min), AI (20/min).

---

## Analytics Engine

`src/utils/analytics/` contains pure calculation functions that take raw data and return metrics. They are stateless and contain no I/O.

| File | Responsibility |
|------|----------------|
| `audienceCalc.js` | Audience demographics aggregation |
| `bestTimeCalc.js` | Optimal posting time from engagement history |
| `consistencyCalc.js` | Publishing consistency score |
| `contentScoring.js` | Content performance ranking |
| `engagementCalc.js` | Engagement rate calculation |
| `growthCalc.js` | Follower growth rate and trend detection |

The `AnalyticsService` calls these functions after fetching raw data from the database, then caches the results for one hour.

---

## Structured Logging and Tracing

Every HTTP request is assigned a `requestId` (UUID) and a `correlationId` (from the `X-Correlation-ID` header, or generated if absent). These identifiers are stored in `AsyncLocalStorage` (`requestContext`) and automatically included in every structured log line for the lifetime of the request.

Log format in production: newline-delimited JSON.
Log format in development: human-readable coloured output.

Both `requestId` and `correlationId` are echoed in response headers (`X-Request-ID`, `X-Correlation-ID`), enabling end-to-end tracing across services and client logs.

---

## In-Process Metrics

`MetricsService` (`src/infrastructure/metrics/index.js`) accumulates live telemetry without an external dependency:

- HTTP request counts by method, route, and status code
- Response time histograms (10 latency buckets)
- AI call counts, error rates, and durations by agent and provider
- Queue job counts by type
- Cache hit rate, miss rate, and error counts
- Process memory and CPU snapshots

The snapshot is exposed at `GET /api/v1/health/metrics` for scraping by an external monitoring system (Prometheus, Datadog, etc.) via a forwarding agent.
