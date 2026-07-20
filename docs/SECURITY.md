# Security — CreatorOS AI Backend

## Authentication

### Access tokens

- Algorithm: HS256 (configurable; keys must be ≥ 512 bits in production).
- Expiry: 15 minutes (`JWT_EXPIRES_IN`).
- Transmitted via `Authorization: Bearer <token>` header.
- Not stored server-side — validation is stateless.

### Refresh tokens

- Long-lived (7 days by default, configurable via `JWT_REFRESH_EXPIRES_IN`).
- Stored in an `httpOnly`, `Secure`, `SameSite=Strict` cookie — inaccessible to JavaScript.
- A SHA-256 hash of the token is persisted in MongoDB (`RefreshToken` collection). The plaintext is never stored.
- Rotating: each use issues a new pair and invalidates the old token.
- Revocable: logout, logout-all, and password change revoke tokens immediately.

### Session management

- Each device/browser has its own `RefreshToken` document.
- Users can inspect and revoke individual sessions via `GET /api/v1/account/sessions` and `DELETE /api/v1/account/sessions/:id`.
- Revoking all other sessions is available via `DELETE /api/v1/account/sessions`.

---

## Authorization

Role-based access control (RBAC) with three roles:

| Role | Description |
|------|-------------|
| `user` | Standard creator account — access to their own data only |
| `admin` | Platform administrator — can toggle feature flags |
| `superadmin` | Full platform access |

Role enforcement uses the `authorize(role)` middleware applied at the route level. No role elevation is possible through the API: the `massAssignment` middleware is available to strip privileged fields, and each route's validator explicitly rejects unexpected fields.

### Workspace roles

Within a workspace, members have additional roles:

| Role | Permissions |
|------|-------------|
| `owner` | Full control, including deletion |
| `admin` | Manage members, full data access |
| `editor` | Read/write content data |
| `viewer` | Read-only |

---

## Transport Security

- **HSTS:** In production, `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` is set.
- **Content-Security-Policy:** Restricts to `default-src 'self'` — no inline scripts, no external resources.
- **X-Frame-Options: DENY** — prevents clickjacking.
- **X-Content-Type-Options: nosniff** — prevents MIME-sniffing.
- **Referrer-Policy: strict-origin-when-cross-origin** — limits referrer leakage.
- **X-Powered-By** header is removed.

---

## Input Hardening

### Prototype pollution prevention

The `prototypePollution` middleware rejects any request body or query string containing `__proto__`, `constructor`, or `prototype` keys with a `400 Invalid request payload` response.

### NoSQL injection prevention

The `noSqlInjection` middleware recursively strips MongoDB operator keys (keys starting with `$`) from `req.body`, `req.query`, and `req.params` before they reach any controller. A value like `{ "$gt": "" }` is replaced with `null`, causing validation to reject it as a missing required field.

### Schema validation

Every route uses `express-validator` chains that:
- Whitelist allowed fields explicitly.
- Reject unknown or privileged fields.
- Sanitize and coerce types.

### HTTP Parameter Pollution

The `hpp()` middleware collapses duplicate query-string keys to their last value, preventing parameter pollution attacks. Specific keys used as arrays (`tags`, `platforms`, `ids`, `fields`) are whitelisted.

---

## Encryption

OAuth access and refresh tokens from social platforms are encrypted with AES-256-GCM before storage in MongoDB:

- Key: `ENCRYPTION_KEY` environment variable — exactly 64 hex characters (32 bytes).
- Each encrypted value includes a randomly generated 12-byte IV and a 16-byte authentication tag.
- Decryption failure (tampered ciphertext) raises an error and does not silently return plaintext.

---

## Rate Limiting

Three independent rate-limit tiers implemented with `express-rate-limit`:

| Tier | Window | Max requests | Applied to |
|------|--------|-------------|------------|
| General | 15 min | 100 | All `/api` routes |
| Auth | 15 min | 10 | `/api/v1/auth/*` |
| AI | 1 min | 20 | AI-intensive endpoints |

Rate limit headers (`RateLimit-Limit`, `RateLimit-Remaining`) are exposed in CORS headers so clients can implement backoff.

---

## API Key Authentication

Programmatic clients can authenticate with API keys (managed via `/api/v1/apikeys`):

- Keys are generated with `crypto.randomBytes` — 32 bytes of entropy, base64url-encoded.
- The full key is returned **only once** at creation.
- Only a SHA-256 hash of the key is stored in MongoDB.
- Keys can be scoped (e.g. `analytics:read`) and set to expire.
- Key revocation takes effect immediately.

---

## Secrets Management

- All secrets are read exclusively from environment variables via `src/config/index.js`. No other file reads `process.env`.
- Development fallback values (`dev_jwt_secret_change_in_production`, etc.) are blocked in production — the server refuses to start if they are used.
- The `.env` file is listed in `.gitignore` and must never be committed.
- CI/CD pipelines should inject secrets via the platform secret manager (e.g. GitHub Actions secrets, AWS Secrets Manager, Doppler).

---

## Dependency Security

```bash
# Audit dependencies for known vulnerabilities
npm audit

# Install with audit
npm ci
```

- `devDependencies` are excluded from the production Docker image (`npm ci --omit=dev`).
- The Docker image runs as a non-root user (`appuser`) with a read-only root filesystem.

---

## Security Checklist for Production

- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are at least 64 random characters and unique per environment.
- [ ] `ENCRYPTION_KEY` is a 64-character hex string generated with `crypto.randomBytes(32)`.
- [ ] `NODE_ENV=production` is set.
- [ ] `MONGODB_URI` uses a dedicated database user with least-privilege permissions.
- [ ] Redis is network-isolated (not exposed to the public internet).
- [ ] TLS is terminated at the load balancer or Nginx — the app itself does not need to serve TLS.
- [ ] `CLIENT_URL` is set to the exact production frontend origin (no wildcard).
- [ ] `npm audit` shows no high or critical vulnerabilities.
- [ ] Docker image runs as non-root (`appuser`).
- [ ] Metrics endpoint (`/api/v1/health/metrics`) is restricted at the network layer if it contains sensitive data.
- [ ] Log aggregator is configured to mask `Authorization` headers and request bodies containing `password`.

---

## Reporting Vulnerabilities

Please report security vulnerabilities via email to the engineering team rather than opening a public issue. Include a description of the vulnerability, steps to reproduce, and the potential impact.
