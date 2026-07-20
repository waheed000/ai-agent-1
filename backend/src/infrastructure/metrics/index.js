/**
 * MetricsService — Phase 15B
 *
 * In-process metrics store. No external dependencies required.
 * Tracks: API requests, response times, memory, CPU, queue jobs,
 *         AI calls, cache hit/miss rates, Redis, and MongoDB health.
 *
 * Design:
 *   - Counters and histograms are plain objects — zero overhead.
 *   - getSnapshot() assembles a full report on demand.
 *   - Services call record* methods; HTTP middleware calls recordRequest().
 */

import { performance } from 'node:perf_hooks';
import mongoose from 'mongoose';
import logger from '../../utils/logger.js';

// ─── Simple histogram (fixed buckets in ms) ───────────────────────────────────

const RESPONSE_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, Infinity];

function makeBuckets() {
  return RESPONSE_BUCKETS.reduce((acc, b) => ({ ...acc, [b]: 0 }), {});
}

function recordBucket(buckets, ms) {
  for (const b of RESPONSE_BUCKETS) {
    if (ms <= b) { buckets[b]++; break; }
  }
}

// ─── MetricsService ───────────────────────────────────────────────────────────

class MetricsService {
  constructor() {
    this._startTime = Date.now();
    this._reset();
  }

  _reset() {
    // HTTP
    this._requests = {
      total:      0,
      byStatus:   {},   // { '200': n, '4xx': n, … }
      byMethod:   {},   // { 'GET': n, … }
      byRoute:    {},   // { '/api/v1/analytics/overview': n, … }
      errors:     0,
    };
    this._responseTimes = {
      count:      0,
      totalMs:    0,
      minMs:      Infinity,
      maxMs:      0,
      buckets:    makeBuckets(),
    };

    // AI
    this._ai = {
      calls:      0,
      errors:     0,
      totalMs:    0,
      byAgent:    {},   // { 'analytics': { calls, errors, totalMs } }
      byProvider: {},   // { 'gemini': { calls, errors } }
    };

    // Queue
    this._queue = {
      enqueued:   0,
      completed:  0,
      failed:     0,
      byType:     {},   // { 'analytics-sync': { enqueued, completed, failed } }
    };

    // Cache (populated by CacheService)
    this._cache = {
      hits:       0,
      misses:     0,
      sets:       0,
      deletes:    0,
      errors:     0,
    };
  }

  // ─── HTTP tracking ────────────────────────────────────────────────────────

  /**
   * Record an HTTP request completion.
   * Called by the requestTrace response-finish handler.
   */
  recordRequest({ method, route, status, durationMs }) {
    this._requests.total++;

    // by status class
    const cls = `${Math.floor(status / 100)}xx`;
    this._requests.byStatus[cls] = (this._requests.byStatus[cls] ?? 0) + 1;
    if (status >= 500) this._requests.errors++;

    // by method
    this._requests.byMethod[method] = (this._requests.byMethod[method] ?? 0) + 1;

    // by route (cap distinct routes to avoid cardinality explosion)
    if (route && Object.keys(this._requests.byRoute).length < 500) {
      const key = `${method} ${route}`;
      this._requests.byRoute[key] = (this._requests.byRoute[key] ?? 0) + 1;
    }

    // response time histogram
    const t = this._responseTimes;
    t.count++;
    t.totalMs += durationMs;
    if (durationMs < t.minMs) t.minMs = durationMs;
    if (durationMs > t.maxMs) t.maxMs = durationMs;
    recordBucket(t.buckets, durationMs);
  }

  // ─── AI tracking ─────────────────────────────────────────────────────────

  /**
   * Record an AI provider call.
   * @param {{ agent?: string, provider?: string, durationMs: number, error?: boolean }} opts
   */
  recordAiCall({ agent, provider, durationMs = 0, error = false }) {
    this._ai.calls++;
    this._ai.totalMs += durationMs;
    if (error) this._ai.errors++;

    if (agent) {
      const a = this._ai.byAgent[agent] ??= { calls: 0, errors: 0, totalMs: 0 };
      a.calls++;
      a.totalMs += durationMs;
      if (error) a.errors++;
    }

    if (provider) {
      const p = this._ai.byProvider[provider] ??= { calls: 0, errors: 0 };
      p.calls++;
      if (error) p.errors++;
    }
  }

  // ─── Queue tracking ───────────────────────────────────────────────────────

  recordJobEnqueued(type = 'unknown') {
    this._queue.enqueued++;
    const b = this._queue.byType[type] ??= { enqueued: 0, completed: 0, failed: 0 };
    b.enqueued++;
  }

  recordJobCompleted(type = 'unknown') {
    this._queue.completed++;
    const b = this._queue.byType[type] ??= { enqueued: 0, completed: 0, failed: 0 };
    b.completed++;
  }

  recordJobFailed(type = 'unknown') {
    this._queue.failed++;
    const b = this._queue.byType[type] ??= { enqueued: 0, completed: 0, failed: 0 };
    b.failed++;
  }

  // ─── Cache tracking ───────────────────────────────────────────────────────

  recordCacheHit()    { this._cache.hits++;    }
  recordCacheMiss()   { this._cache.misses++;  }
  recordCacheSet()    { this._cache.sets++;    }
  recordCacheDelete() { this._cache.deletes++; }
  recordCacheError()  { this._cache.errors++;  }

  // ─── Snapshot ─────────────────────────────────────────────────────────────

  /**
   * Return a full metrics snapshot suitable for /health/metrics or logging.
   */
  getSnapshot() {
    const t  = this._responseTimes;
    const cacheTotal = this._cache.hits + this._cache.misses;

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      uptime: {
        startedAt: new Date(this._startTime).toISOString(),
        uptimeMs:  Date.now() - this._startTime,
      },

      process: {
        pid:    process.pid,
        memory: {
          heapUsedMb:  Math.round(memUsage.heapUsed  / 1024 / 1024 * 100) / 100,
          heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
          rssMb:       Math.round(memUsage.rss       / 1024 / 1024 * 100) / 100,
          externalMb:  Math.round(memUsage.external  / 1024 / 1024 * 100) / 100,
        },
        cpu: {
          userMs:   Math.round(cpuUsage.user   / 1000),
          systemMs: Math.round(cpuUsage.system / 1000),
        },
      },

      http: {
        requests: {
          total:    this._requests.total,
          errors:   this._requests.errors,
          byStatus: this._requests.byStatus,
          byMethod: this._requests.byMethod,
          byRoute:  this._requests.byRoute,
        },
        responseTimes: {
          count:   t.count,
          avgMs:   t.count ? Math.round(t.totalMs / t.count * 100) / 100 : 0,
          minMs:   t.minMs === Infinity ? 0 : t.minMs,
          maxMs:   t.maxMs,
          buckets: t.buckets,
        },
      },

      ai: {
        calls:      this._ai.calls,
        errors:     this._ai.errors,
        avgMs:      this._ai.calls ? Math.round(this._ai.totalMs / this._ai.calls) : 0,
        byAgent:    this._ai.byAgent,
        byProvider: this._ai.byProvider,
      },

      queue: {
        enqueued:  this._queue.enqueued,
        completed: this._queue.completed,
        failed:    this._queue.failed,
        byType:    this._queue.byType,
      },

      cache: {
        hits:     this._cache.hits,
        misses:   this._cache.misses,
        sets:     this._cache.sets,
        deletes:  this._cache.deletes,
        errors:   this._cache.errors,
        hitRate:  cacheTotal ? Math.round(this._cache.hits / cacheTotal * 10000) / 100 : null,
      },

      database: {
        readyState: mongoose.connection.readyState,
        // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        status: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] ?? 'unknown',
      },
    };
  }

  /** Reset all counters (useful for testing). */
  reset() { this._reset(); }
}

export default new MetricsService();
