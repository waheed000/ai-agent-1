# API Reference — CreatorOS AI

**Base URL:** `https://api.yourdomain.com/api/v1`

**Interactive docs (Swagger UI):** `GET /api/v1/docs`

**Raw OpenAPI spec:** `GET /api/v1/docs/json`

---

## Authentication

Most endpoints require a Bearer token:

```
Authorization: Bearer <access_token>
```

Obtain tokens via `POST /auth/login` or `POST /auth/register`.
Access tokens expire in 15 minutes. Use `POST /auth/refresh-token` to renew.

---

## Response Envelope

All responses follow a consistent structure:

```json
// Success
{
  "success": true,
  "message": "Operation completed",
  "data": { ... }
}

// Error
{
  "success": false,
  "message": "Human-readable description",
  "code": "ERROR_CODE",
  "errors": [{ "field": "email", "message": "Invalid format" }]
}
```

### Common error codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `AUTHENTICATION_ERROR` | 401 | Missing or invalid token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Request Tracing

Every response includes:

| Header | Description |
|--------|-------------|
| `X-Request-ID` | UUID for this specific request |
| `X-Correlation-ID` | Caller-provided or generated trace ID |

Pass `X-Correlation-ID` in your requests to trace calls across services.

---

## Pagination

List endpoints return a `meta` object alongside `data`:

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "pages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

Use `?page=2&limit=20` query parameters to paginate.

---

## Endpoints

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | General health status |
| GET | `/health/live` | None | Liveness probe |
| GET | `/health/ready` | None | Readiness probe |
| GET | `/health/dependencies` | None | Full dependency report |
| GET | `/health/metrics` | None | In-process metrics snapshot |

---

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Register a new account |
| POST | `/auth/login` | None | Log in |
| POST | `/auth/refresh-token` | None | Refresh access token |
| POST | `/auth/logout` | Bearer | Log out current session |
| POST | `/auth/logout-all` | Bearer | Log out all sessions |
| GET | `/auth/me` | Bearer | Get current user profile |
| PATCH | `/auth/profile` | Bearer | Update name, avatar, timezone |
| PATCH | `/auth/change-password` | Bearer | Change password |
| DELETE | `/auth/account` | Bearer | Delete account (irreversible) |

---

### Account

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/account/sessions` | Bearer | List active sessions |
| DELETE | `/account/sessions` | Bearer | Revoke all other sessions |
| DELETE | `/account/sessions/:id` | Bearer | Revoke a specific session |

---

### Integrations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/integrations` | Bearer | List connected social accounts |
| DELETE | `/integrations/:platform` | Bearer | Disconnect a platform |

Platforms: `youtube`, `instagram`, `tiktok`, `linkedin`, `x`

---

### Platforms

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/platforms/:platform/sync` | Bearer | Trigger a platform data sync |
| GET | `/platforms/:platform/status` | Bearer | Get sync status |

---

### Jobs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/jobs/health` | None | Queue health check |
| GET | `/jobs/queues` | None | Per-queue statistics |
| GET | `/jobs/history` | Bearer | Job execution history |
| POST | `/jobs/platforms/:platform/sync` | Bearer | Trigger a sync job |

---

### Analytics

All analytics endpoints accept optional query parameters:
- `dateFrom` (date, YYYY-MM-DD)
- `dateTo` (date, YYYY-MM-DD)
- `platform` (`youtube` | `instagram` | `tiktok` | `linkedin` | `x` | `all`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics/overview` | Bearer | Aggregate metrics overview |
| GET | `/analytics/growth` | Bearer | Follower growth time series |
| GET | `/analytics/engagement` | Bearer | Engagement time series |
| GET | `/analytics/content-performance` | Bearer | Top-performing content |
| GET | `/analytics/best-posting-time` | Bearer | Optimal posting time recommendations |
| GET | `/analytics/audience` | Bearer | Audience demographics |

---

### Competitors

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/competitors` | Bearer | Track a competitor |
| GET | `/competitors` | Bearer | List tracked competitors |
| DELETE | `/competitors/:id` | Bearer | Stop tracking a competitor |
| GET | `/competitors/:id/overview` | Bearer | Competitor analytics overview |
| POST | `/competitors/:id/sync` | Bearer | Force a competitor data sync |

---

### Trends

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/trends` | None | Current trends |
| GET | `/trends/topics` | None | Trending topics |
| GET | `/trends/hashtags` | None | Trending hashtags |
| GET | `/trends/creators` | None | Trending creators |
| POST | `/trends/refresh` | Bearer | Trigger a trend data refresh |

---

### Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reports/generate` | Bearer | Generate an AI report |
| GET | `/reports` | Bearer | List reports |
| GET | `/reports/latest` | Bearer | Get the latest report |
| GET | `/reports/:id` | Bearer | Get a report by ID |
| DELETE | `/reports/:id` | Bearer | Delete a report |

---

### Strategy

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/strategy/generate` | Bearer | Generate an AI growth strategy |
| GET | `/strategy` | Bearer | List strategies |
| GET | `/strategy/latest` | Bearer | Get the latest strategy |

---

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Bearer | List notifications |
| PATCH | `/notifications/read-all` | Bearer | Mark all as read |
| PATCH | `/notifications/preferences` | Bearer | Update notification preferences |
| PATCH | `/notifications/:id/read` | Bearer | Mark one as read |
| DELETE | `/notifications/:id` | Bearer | Delete a notification |

---

### Planner

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/planner/generate` | Bearer | Generate an AI content plan |
| GET | `/planner` | Bearer | List content plan items |
| PATCH | `/planner/:id` | Bearer | Update a plan item |
| DELETE | `/planner/:id` | Bearer | Delete a plan item |

---

### Calendar

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/calendar` | Bearer | Calendar view of content plan |

Query param: `month` (YYYY-MM)

---

### Drafts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/drafts` | Bearer | Create a draft |
| PATCH | `/drafts/:id` | Bearer | Update a draft |
| DELETE | `/drafts/:id` | Bearer | Delete a draft |

---

### Workspaces

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/workspaces` | Bearer | Create a workspace |
| GET | `/workspaces` | Bearer | List joined workspaces |
| GET | `/workspaces/:id` | Bearer | Get workspace details |
| PATCH | `/workspaces/:id` | Bearer | Update a workspace |
| DELETE | `/workspaces/:id` | Bearer (owner) | Delete a workspace |
| POST | `/workspaces/:id/invite` | Bearer (admin+) | Invite a member |
| GET | `/workspaces/:id/members` | Bearer | List members |
| PATCH | `/workspaces/:id/members/:user` | Bearer (admin+) | Update member role |
| DELETE | `/workspaces/:id/members/:user` | Bearer (admin+) | Remove a member |
| GET | `/workspaces/:id/audit` | Bearer | Workspace audit log |

---

### API Keys

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/apikeys` | Bearer | Create an API key |
| GET | `/apikeys` | Bearer | List API keys (metadata only) |
| PATCH | `/apikeys/:id` | Bearer | Update an API key |
| DELETE | `/apikeys/:id` | Bearer | Delete an API key |
| POST | `/apikeys/:id/revoke` | Bearer | Revoke an API key |

---

### Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search?q=<query>` | Bearer | Full-text search |

Query params: `q` (required), `type` (`report` | `strategy` | `plan` | `draft` | `competitor` | `all`), `page`, `limit`

---

### Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings` | Bearer | All settings |
| GET | `/settings/:type` | Bearer | Settings by type |
| PATCH | `/settings/:type` | Bearer | Update settings |

Types: `notifications`, `privacy`, `display`, `integrations`

---

### Usage

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/usage/summary` | Bearer | AI usage summary for current period |
| GET | `/usage` | Bearer | Paginated usage history |

---

### Audit

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/audit` | Bearer | User audit log |

Query params: `page`, `limit`, `action`, `dateFrom`, `dateTo`

---

### Features

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/features` | Bearer | List feature flags |
| GET | `/features/:key` | Bearer | Get a feature flag |
| PATCH | `/features/:key` | Bearer (admin+) | Toggle a feature flag |
