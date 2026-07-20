/**
 * Structured JSON logger with AsyncLocalStorage context propagation.
 *
 * Every log line is a single JSON object containing:
 *   timestamp, level, message, requestId, correlationId,
 *   userId, workspaceId (when available), plus any ad-hoc meta fields.
 *
 * The requestContext store is populated by the requestTrace middleware and
 * enriched by the authenticate middleware — all code that runs inside a
 * request handler automatically inherits those fields with no extra effort.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import config from '../config/index.js';

// ─── Request context store ────────────────────────────────────────────────────

/**
 * Shared AsyncLocalStorage instance.
 * Set by requestTrace middleware; readable from any async code in the chain.
 *
 * Shape: { requestId, correlationId, userId?, workspaceId?, userRole? }
 */
export const requestContext = new AsyncLocalStorage();

// ─── Level control ────────────────────────────────────────────────────────────

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LEVELS[config.logging?.level] ?? LEVELS.info;

// ─── Serializer ───────────────────────────────────────────────────────────────

function serialize(level, message, meta = {}) {
  const store = requestContext.getStore() ?? {};
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    // request context fields (only present when inside a request)
    ...(store.requestId     && { requestId:     store.requestId }),
    ...(store.correlationId && { correlationId: store.correlationId }),
    ...(store.userId        && { userId:        store.userId }),
    ...(store.workspaceId   && { workspaceId:   store.workspaceId }),
    ...(store.userRole      && { userRole:      store.userRole }),
    // caller-supplied metadata
    ...meta,
  };

  // In development use pretty output; in production pure JSON for log aggregators.
  if (config.isDevelopment) {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    const ctxStr  = store.requestId ? ` [${store.requestId.slice(0, 8)}]` : '';
    return `[${entry.timestamp}]${ctxStr} [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  return JSON.stringify(entry);
}

// ─── Logger ───────────────────────────────────────────────────────────────────

const logger = {
  error(message, meta = {}) {
    if (CURRENT_LEVEL >= LEVELS.error) process.stderr.write(serialize('error', message, meta) + '\n');
  },

  warn(message, meta = {}) {
    if (CURRENT_LEVEL >= LEVELS.warn) process.stderr.write(serialize('warn', message, meta) + '\n');
  },

  info(message, meta = {}) {
    if (CURRENT_LEVEL >= LEVELS.info) process.stdout.write(serialize('info', message, meta) + '\n');
  },

  debug(message, meta = {}) {
    if (CURRENT_LEVEL >= LEVELS.debug) process.stdout.write(serialize('debug', message, meta) + '\n');
  },

  /**
   * Create a child logger that merges preset fields into every log call.
   * Useful for component-level loggers: logger.child({ component: 'QueueService' })
   *
   * @param {object} fields  Fields always merged into meta.
   */
  child(fields = {}) {
    return {
      error: (msg, meta = {}) => logger.error(msg, { ...fields, ...meta }),
      warn:  (msg, meta = {}) => logger.warn(msg,  { ...fields, ...meta }),
      info:  (msg, meta = {}) => logger.info(msg,  { ...fields, ...meta }),
      debug: (msg, meta = {}) => logger.debug(msg, { ...fields, ...meta }),
      child: (moreFields = {}) => logger.child({ ...fields, ...moreFields }),
    };
  },
};

export default logger;
