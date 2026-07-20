# Deployment Guide — CreatorOS AI Backend

## Prerequisites

| Dependency | Minimum version | Notes |
|------------|----------------|-------|
| Node.js | 18 LTS | 20 LTS recommended |
| MongoDB | 6 | 7 recommended |
| Redis | 6 | 7 recommended |

---

## Environment Configuration

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Set every **required** variable. The server refuses to start in production if any required variable is missing or uses a development default:

   ```
   MONGODB_URI        — MongoDB connection string
   JWT_SECRET         — Minimum 64 random characters
   JWT_REFRESH_SECRET — Minimum 64 random characters
   ENCRYPTION_KEY     — Exactly 64 hex characters (32 bytes)
   ```

   **Generate secrets:**
   ```bash
   # JWT secrets (64-char random hex)
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

   # Encryption key (32 bytes = 64 hex chars)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Configure at least one AI provider for AI features to work:
   ```
   GEMINI_API_KEY=...
   # or
   OPENAI_API_KEY=...
   ```

4. Set the allowed CORS origin:
   ```
   CLIENT_URL=https://your-frontend-domain.com
   ```

---

## Docker Deployment (recommended)

### Build and run

```bash
# Production — builds from source, starts MongoDB and Redis
docker compose up -d

# Check all services are healthy
docker compose ps

# Tail API logs
docker compose logs -f api
```

### docker-compose.yml services

| Service | Image | Purpose |
|---------|-------|---------|
| `api` | Built from `Dockerfile` | Node.js application |
| `mongo` | `mongo:7` | MongoDB 7, persistent volume |
| `redis` | `redis:7-alpine` | Redis 7 with AOF persistence |

### Dockerfile highlights

- **Multi-stage build** — production image only includes runtime dependencies (no devDependencies, no build tools).
- **Non-root user** — the `appuser` system user runs the process; no container runs as root.
- **Built-in healthcheck** — hits `GET /api/v1/health` every 30 s; the container is marked unhealthy after 3 failures.

---

## Bare-Metal / VM Deployment

```bash
# Install production dependencies only
npm ci --omit=dev

# Set environment
export NODE_ENV=production
# ... set all required variables ...

# Start
node src/server.js
```

### Process management with PM2

```bash
npm install -g pm2

pm2 start src/server.js \
  --name creator-os-api \
  --instances max \        # one per CPU core
  --exec-mode cluster

pm2 save
pm2 startup               # install init script
```

---

## Reverse Proxy (Nginx)

```nginx
upstream creator_os {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;

    location / {
        proxy_pass         http://creator_os;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection keep-alive;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Set `TRUST_PROXY=1` in `.env` so Express reads `X-Forwarded-For` correctly.

---

## Health and Readiness Checks

| Probe | Endpoint | Use case |
|-------|----------|---------|
| Liveness | `GET /api/v1/health/live` | Container restart policy |
| Readiness | `GET /api/v1/health/ready` | Load balancer traffic gate |
| General | `GET /api/v1/health` | Uptime monitoring |
| Dependencies | `GET /api/v1/health/dependencies` | Alerting on DB/Redis issues |

### Kubernetes example

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 15

readinessProbe:
  httpGet:
    path: /api/v1/health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3
```

---

## Database

### MongoDB indexes

Indexes are defined in each Mongoose model schema and created automatically on application startup via Mongoose's `autoIndex` (enabled by default). In production with large datasets, run index creation manually during off-peak hours:

```bash
node -e "
import('./src/infrastructure/database/index.js').then(() =>
  import('./src/models/index.js')
).then(() => {
  console.log('Indexes synced');
  process.exit(0);
});
"
```

### Backups

Use `mongodump` or MongoDB Atlas automated backups. Target a recovery point objective (RPO) of ≤ 1 hour for the `creator-os` database.

---

## Redis

Redis is **optional** — the application degrades gracefully when Redis is unavailable:
- In-memory caching is disabled (all cache misses).
- BullMQ queues are disabled (AI jobs fail fast with a logged warning).

For production, enable Redis persistence (AOF or RDB) to avoid losing queued jobs across restarts.

---

## Scaling

### Horizontal scaling

The application is stateless — authentication is token-based (no server-side session state), and all shared state lives in MongoDB and Redis. Multiple instances can run behind a load balancer without sticky sessions.

Ensure all instances share:
- The same `JWT_SECRET` and `JWT_REFRESH_SECRET` (so tokens issued by instance A are verifiable by instance B).
- The same Redis instance (for distributed queues and cache).
- The same MongoDB cluster.

### Vertical scaling

Queue concurrency is controlled by `QUEUE_CONCURRENCY` (default 2). Increase it on boxes with more CPU cores to process more AI jobs in parallel.

---

## Monitoring

- **Metrics endpoint:** `GET /api/v1/health/metrics` returns an in-process snapshot. Forward this to Prometheus / Datadog via a compatible agent.
- **Structured logs:** Every log line is newline-delimited JSON in production. Ship to a log aggregator (Datadog, Grafana Loki, ELK).
- **Tracing:** Every request includes `X-Request-ID` and `X-Correlation-ID` response headers. Include `X-Correlation-ID` in client requests to trace a call end-to-end across services.

---

## Graceful Shutdown

The server catches `SIGTERM` and `SIGINT`, drains in-flight requests for up to `SHUTDOWN_TIMEOUT_MS` (default 15 s), then exits. Ensure your process manager or orchestrator sends `SIGTERM` (not `SIGKILL`) to allow clean shutdown.
