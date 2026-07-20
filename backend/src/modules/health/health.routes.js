/**
 * Health-check routes — Phase 15B
 *
 * GET /api/v1/health               — general status (database, uptime, version)
 * GET /api/v1/health/live          — liveness probe  (is the process alive?)
 * GET /api/v1/health/ready         — readiness probe (is the server ready for traffic?)
 * GET /api/v1/health/dependencies  — full dependency report (DB, Redis, queues)
 * GET /api/v1/health/metrics       — MetricsService snapshot (internal use)
 */

import { Router }           from 'express';
import { getDatabaseStatus } from '../../infrastructure/database/index.js';
import QueueService          from '../../infrastructure/queue/index.js';
import CacheService          from '../../infrastructure/cache/index.js';
import MetricsService        from '../../infrastructure/metrics/index.js';
import asyncHandler          from '../../utils/asyncHandler.js';
import mongoose              from 'mongoose';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isDbReady = () => mongoose.connection.readyState === 1;

// ─── GET /health ──────────────────────────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const db = getDatabaseStatus();

    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      data: {
        status:      'ok',
        database:    db,
        environment: process.env.NODE_ENV || 'development',
        uptime:      process.uptime(),
        timestamp:   new Date().toISOString(),
        version:     process.env.npm_package_version || '1.0.0',
      },
    });
  }),
);

// ─── GET /health/live ─────────────────────────────────────────────────────────
// Kubernetes liveness probe — returns 200 as long as the process is running.
// Never checks external dependencies (that would cause unnecessary restarts).

router.get(
  '/live',
  (_req, res) => {
    res.status(200).json({
      success:   true,
      status:    'alive',
      timestamp: new Date().toISOString(),
      pid:       process.pid,
      uptimeSec: Math.floor(process.uptime()),
    });
  },
);

// ─── GET /health/ready ────────────────────────────────────────────────────────
// Kubernetes readiness probe — returns 200 only when the server can serve traffic.
// Checks MongoDB connectivity (required) and Redis (degraded is still ready).

router.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const dbReady    = isDbReady();
    const cacheAlive = await CacheService.ping();

    const ready = dbReady; // Redis degradation is acceptable — we still serve traffic

    res.status(ready ? 200 : 503).json({
      success:   ready,
      status:    ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status:    dbReady ? 'ok' : 'error',
          required:  true,
        },
        cache: {
          status:   cacheAlive ? 'ok' : 'degraded',
          required: false,   // cache is optional — app runs without Redis
        },
      },
    });
  }),
);

// ─── GET /health/dependencies ─────────────────────────────────────────────────
// Deep dependency inspection — suitable for dashboards and alerting.
// Returns status of every backing service with latency measurements.

router.get(
  '/dependencies',
  asyncHandler(async (_req, res) => {
    const start  = Date.now();

    // ── MongoDB ────────────────────────────────────────────────────────────
    let dbStatus = 'error';
    let dbLatMs  = null;
    try {
      const t0 = Date.now();
      await mongoose.connection.db.admin().ping();
      dbLatMs  = Date.now() - t0;
      dbStatus = 'ok';
    } catch {
      dbStatus = 'error';
    }

    // ── Redis / Cache ──────────────────────────────────────────────────────
    let cacheStatus = CacheService.enabled ? 'unknown' : 'disabled';
    let cacheLatMs  = null;
    if (CacheService.enabled) {
      try {
        const t0 = Date.now();
        await CacheService.ping();
        cacheLatMs  = Date.now() - t0;
        cacheStatus = 'ok';
      } catch {
        cacheStatus = 'error';
      }
    }

    // ── Queue ──────────────────────────────────────────────────────────────
    const queueHealth = await QueueService.getHealth();
    const queueStats  = await QueueService.getQueueStats();

    // ── Overall ────────────────────────────────────────────────────────────
    const allOk  = dbStatus === 'ok';
    const status = allOk ? 'ok' : 'degraded';

    res.status(allOk ? 200 : 503).json({
      success:     allOk,
      status,
      timestamp:   new Date().toISOString(),
      totalCheckMs: Date.now() - start,
      dependencies: {
        database: {
          status:        dbStatus,
          latencyMs:     dbLatMs,
          readyState:    mongoose.connection.readyState,
          isMemory:      getDatabaseStatus().isMemory,
        },
        cache: {
          status:    cacheStatus,
          latencyMs: cacheLatMs,
          enabled:   CacheService.enabled,
          stats:     CacheService.getStats(),
        },
        queue: {
          status:  queueHealth.status,
          enabled: QueueService.enabled,
          queues:  queueStats,
        },
      },
    });
  }),
);

// ─── GET /health/metrics ──────────────────────────────────────────────────────
// Internal metrics snapshot — not exposed publicly; restrict in production via firewall / auth.

router.get(
  '/metrics',
  asyncHandler(async (_req, res) => {
    res.status(200).json({
      success:   true,
      timestamp: new Date().toISOString(),
      data:      MetricsService.getSnapshot(),
    });
  }),
);

export default router;
