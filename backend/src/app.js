/**
 * Express application factory — Phase 15B
 * Configures the app without binding a port (keeps testing clean).
 *
 * Middleware order:
 *   1. requestTrace      — attach requestId / correlationId (must be first)
 *   2. helmet            — security headers
 *   3. cors              — cross-origin policy
 *   4. prototypePollution — reject __proto__ / constructor / prototype keys
 *   5. noSqlInjection    — strip MongoDB operator keys from body/query/params
 *   6. hpp               — collapse duplicate query-string keys
 *   7. massAssignment    — strip privileged fields from body
 *   8. compression       — gzip response bodies
 *   9. rate limiting     — IP-based caps
 *  10. request logging   — structured HTTP access log via logger
 *  11. body parsing      — JSON + urlencoded
 *  12. cookie parser
 *  13. routes
 *  14. notFound / errorHandler
 */

import express     from 'express';
import helmet      from 'helmet';
import compression from 'compression';
import cors        from 'cors';
import cookieParser from 'cookie-parser';

import config    from './config/index.js';
import logger    from './utils/logger.js';
import MetricsService from './infrastructure/metrics/index.js';

// Middleware
import requestTrace                                  from './shared/middleware/requestTrace.js';
import { noSqlInjection, prototypePollution, hpp, massAssignment }
                                                     from './shared/middleware/securityMiddleware.js';
import { generalLimiter }                            from './shared/middleware/rateLimiter.js';
import notFound                                      from './shared/middleware/notFound.js';
import errorHandler                                  from './shared/middleware/errorHandler.js';

import apiRouter from './routes/index.js';

const app = express();

// ─── 1. Request tracing (first — gives every subsequent handler a requestId) ──
app.use(requestTrace);

// ─── 2. Security headers (Helmet) ─────────────────────────────────────────────
app.use(
  helmet({
    // Content-Security-Policy: tight but allow same-origin for the API
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        objectSrc:  ["'none'"],
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
    // Strict-Transport-Security: 1 year + subdomains in prod
    hsts: config.isProduction
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
      : false,
    // Prevent browsers from MIME-sniffing
    noSniff: true,
    // Don't send X-Powered-By: Express
    hidePoweredBy: true,
    // X-Frame-Options: DENY — API never needs to be framed
    frameguard: { action: 'deny' },
    // X-XSS-Protection (legacy browsers)
    xssFilter: true,
    // Referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Permissions policy — API server needs none of these
    crossOriginEmbedderPolicy: false,
  }),
);

// ─── 3. CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin:         config.cors.clientUrl,
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    exposedHeaders: ['X-Request-ID', 'X-Correlation-ID', 'RateLimit-Limit', 'RateLimit-Remaining'],
    maxAge:         86_400, // preflight cache: 24 h
  }),
);

// ─── 4. Query-level hardening (query/params exist before body parse) ──────────
app.use(hpp());                // collapse duplicate query params (whitelist: tags, platforms, etc.)

// ─── 5. Performance ───────────────────────────────────────────────────────────
app.use(compression());

// ─── 6. Rate limiting ─────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─── 7. Metrics instrumentation ───────────────────────────────────────────────
app.use((req, res, next) => {
  res.on('finish', () => {
    MetricsService.recordRequest({
      method:     req.method,
      route:      req.route?.path ?? req.path,
      status:     res.statusCode,
      durationMs: 0, // requestTrace already measures duration; this is a lightweight counter
    });
  });
  next();
});

// ─── 8. Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: config.server.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }));

// ─── 9. Cookie parser ─────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── 10. Body-level hardening (must run after body parsing so req.body is set) ─
app.use(prototypePollution);   // reject __proto__ / constructor / prototype in parsed body
app.use(noSqlInjection);       // strip $ operators from parsed body, query, and params
// massAssignment is exported for opt-in use on specific routes — not applied globally
// because field-level validation already exists in each route's validator middleware.

// ─── 13. Proxy trust ──────────────────────────────────────────────────────────
app.set('trust proxy', config.server.trustProxy);

// ─── 14. Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── 15. Error handling (must be last) ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
