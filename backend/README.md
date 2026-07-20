# CreatorOS AI — Backend

A production-grade REST API powering the CreatorOS creator intelligence platform. Built with Node.js, Express, MongoDB, Redis, and BullMQ.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Running with Docker](#running-with-docker)
- [Running Tests](#running-tests)
- [API Documentation](#api-documentation)
- [Health Endpoints](#health-endpoints)
- [Architecture Overview](#architecture-overview)

---

## Quick Start

**Prerequisites:** Node.js ≥ 18, MongoDB, Redis.

```bash
# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env — see Environment Variables section

# Start the development server (auto-reloads on file changes)
npm run dev
```

The server starts on `PORT` (default `3000`).

---

## Environment Variables

All configuration is managed through environment variables. Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `production` enables strict validation and HSTS |
| `PORT` | No | `3000` | HTTP port |
| `MONGODB_URI` | Prod | in-memory | MongoDB connection string. Omit in dev for an auto-started in-memory database |
| `JWT_SECRET` | Yes | dev fallback | Secret for signing access tokens (min 64 chars in prod) |
| `JWT_REFRESH_SECRET` | Yes | dev fallback | Secret for signing refresh tokens |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `ENCRYPTION_KEY` | Prod | dev fallback | 64-character hex string for AES-256-GCM encryption of OAuth tokens |
| `CLIENT_URL` | No | `http://localhost:5173` | Allowed CORS origin |
| `LOG_LEVEL` | No | `info` | `error` \| `warn` \| `info` \| `debug` |
| `REDIS_HOST` | No | `127.0.0.1` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | — | Redis password (if auth is enabled) |
| `GEMINI_API_KEY` | No | — | Google Gemini API key for AI features |
| `OPENAI_API_KEY` | No | — | OpenAI API key (alternative AI provider) |
| `AI_DEFAULT_PROVIDER` | No | `gemini` | `gemini` or `openai` |

See `.env.example` for the full list including OAuth provider credentials, rate limit overrides, cache TTL overrides, and queue tuning parameters.

---

## Project Structure

```
backend/
├── src/
│   ├── ai/                    # AI agent architecture
│   │   ├── agents/            # Domain-specific agents (Analytics, Content, Growth, ...)
│   │   ├── AgentOrchestrator.js
│   │   ├── AgentRegistry.js
│   │   ├── ContextBuilder.js
│   │   ├── MemoryService.js
│   │   ├── PromptBuilder.js
│   │   └── PromptTemplates.js
│   ├── config/                # Centralized environment configuration
│   ├── docs/                  # OpenAPI spec and Swagger UI route
│   ├── events/                # Event bus and domain event listeners
│   │   └── listeners/
│   ├── infrastructure/        # Cross-cutting infrastructure
│   │   ├── cache/             # Redis CacheService
│   │   ├── database/          # Mongoose connection
│   │   ├── metrics/           # In-process MetricsService
│   │   └── queue/             # BullMQ QueueService
│   ├── models/                # Mongoose schemas
│   ├── modules/               # Domain modules (feature-sliced)
│   │   ├── account/           # Session management
│   │   ├── analytics/         # Creator analytics
│   │   ├── apikeys/           # Programmatic API access
│   │   ├── audit/             # Audit log
│   │   ├── auth/              # Authentication
│   │   ├── competitors/       # Competitor tracking
│   │   ├── content/           # Planner, calendar, drafts
│   │   ├── features/          # Feature flags
│   │   ├── health/            # Health and readiness probes
│   │   ├── integrations/      # Connected social accounts
│   │   ├── jobs/              # Background job management
│   │   ├── notifications/     # In-app notifications
│   │   ├── platforms/         # Platform sync
│   │   ├── reports/           # AI-generated reports
│   │   ├── search/            # Full-text search
│   │   ├── settings/          # User settings
│   │   ├── strategy/          # AI growth strategy
│   │   ├── trends/            # Platform trend discovery
│   │   ├── usage/             # AI usage tracking
│   │   └── workspaces/        # Team workspaces
│   ├── queues/                # BullMQ workers and scheduler
│   │   └── workers/
│   ├── routes/                # Central API router (v1)
│   ├── shared/
│   │   └── middleware/        # Shared Express middleware
│   ├── tests/                 # Integration test suites
│   ├── utils/                 # Utility functions
│   │   └── analytics/         # Analytics calculation helpers
│   ├── app.js                 # Express app factory (no port binding)
│   └── server.js              # Entry point — binds port, starts workers
├── .env.example
├── Dockerfile
├── Dockerfile.dev
├── docker-compose.yml
├── docker-compose.dev.yml
└── package.json
```

Each module under `src/modules/` follows the same structure:

```
<module>/
├── <Module>Controller.js   # HTTP layer — validates input, calls service, formats response
├── <Module>Service.js      # Business logic — orchestrates repositories and events
├── <Module>Repository.js   # Data access — all MongoDB queries live here
├── <module>.routes.js      # Express router — binds HTTP methods to controller actions
└── <module>Validators.js   # express-validator chains
```

---

## Running with Docker

### Production

```bash
# Build and start all services (API, MongoDB, Redis)
docker compose up -d

# Check service status
docker compose ps

# Tail logs
docker compose logs -f api
```

### Development

```bash
# Start with live-reload and exposed MongoDB port
docker compose -f docker-compose.dev.yml up
```

---

## Running Tests

The test suite uses Node.js native test runner with an in-memory MongoDB instance.

```bash
# Run all tests
npm test

# Run a single test file
node --test src/tests/phase15b.test.js

# Watch mode
npm run test:watch
```

---

## API Documentation

Interactive API documentation (Swagger UI) is available at:

```
http://localhost:3000/api/v1/docs
```

The raw OpenAPI 3.0 JSON spec is at:

```
http://localhost:3000/api/v1/docs/json
```

---

## Health Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/v1/health` | None | General status (DB, uptime, version) |
| `GET /api/v1/health/live` | None | Liveness probe — process is running |
| `GET /api/v1/health/ready` | None | Readiness probe — DB connected, ready for traffic |
| `GET /api/v1/health/dependencies` | None | Full dependency report with latency |
| `GET /api/v1/health/metrics` | None | In-process metrics snapshot |

---

## Architecture Overview

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed description of the system design, including the AI agent architecture, event bus, repository pattern, queue system, and caching strategy.

See [DEPLOYMENT.md](DEPLOYMENT.md) for Docker, environment, and production deployment guidance.

See [SECURITY.md](SECURITY.md) for security controls, threat model, and hardening checklist.
