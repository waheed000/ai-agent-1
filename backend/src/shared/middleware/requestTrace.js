/**
 * Request tracing middleware.
 *
 * Per request:
 *   1. Generates a unique requestId (UUID v4).
 *   2. Reads X-Correlation-ID from the inbound headers, or generates one if absent.
 *   3. Runs the rest of the middleware chain inside an AsyncLocalStorage context
 *      so the structured logger automatically includes both IDs in every log line.
 *   4. Exposes X-Request-ID and X-Correlation-ID in the response headers.
 *   5. Logs a structured HTTP access record on response finish.
 *
 * Usage in app.js — register FIRST, before any other middleware:
 *   app.use(requestTrace);
 */

import { randomUUID } from 'node:crypto';
import logger, { requestContext } from '../../utils/logger.js';

const requestTrace = (req, res, next) => {
  const requestId     = randomUUID();
  const correlationId = (req.headers['x-correlation-id'] || randomUUID()).toString().slice(0, 128);
  const startTime     = process.hrtime.bigint();

  // Expose IDs immediately — even error responses carry them.
  res.setHeader('X-Request-ID',     requestId);
  res.setHeader('X-Correlation-ID', correlationId);

  const context = { requestId, correlationId };

  // Log the completed request when the socket drains.
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;

    // Pull the current store (may have been enriched by authenticate middleware)
    const store = requestContext.getStore() ?? context;

    logger.info('HTTP request completed', {
      http: {
        method:     req.method,
        url:        req.originalUrl,
        route:      req.route?.path ?? req.path,
        status:     res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      },
      network: {
        ip:        req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      },
      ...(store.userId      && { userId:      store.userId }),
      ...(store.workspaceId && { workspaceId: store.workspaceId }),
    });
  });

  // Run everything inside the AsyncLocalStorage context so child calls
  // (service, repository, logger) automatically inherit requestId/correlationId.
  requestContext.run(context, next);
};

/**
 * Enrich the current request context with user identity.
 * Call this after req.user has been populated (e.g. at the end of authenticate()).
 *
 * @param {import('express').Request} req
 */
export function enrichRequestContext(req) {
  const store = requestContext.getStore();
  if (!store) return;
  if (req.user)      store.userId    = String(req.user._id);
  if (req.user?.role) store.userRole = req.user.role;
}

/**
 * Enrich the context with workspace identity.
 * Call this after req.workspace has been resolved.
 *
 * @param {string} workspaceId
 */
export function enrichWorkspaceContext(workspaceId) {
  const store = requestContext.getStore();
  if (store && workspaceId) store.workspaceId = String(workspaceId);
}

export default requestTrace;
