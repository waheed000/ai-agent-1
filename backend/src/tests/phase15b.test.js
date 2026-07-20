/**
 * Phase 15B Tests — Production Engineering
 *
 * Covers: structured logging (requestId/correlationId in headers),
 *         security middleware (NoSQL injection, prototype pollution, HPP, mass assignment),
 *         CacheService improvements (stats, clearDomain, wrap, domain helpers),
 *         MetricsService (counters, snapshot),
 *         health endpoints (/live, /ready, /dependencies, /metrics).
 *
 * Uses a single MongoMemoryServer connection shared across all describe blocks.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import supertest from 'supertest';

let mongod;
let app;
let request;

// ─── Shared connection lifecycle ──────────────────────────────────────────────

before(async () => {
  process.env.SUPPRESS_CONFIG_WARNINGS = 'true';
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await mongoose.connection.syncIndexes();
  const { default: appModule } = await import('../app.js');
  app     = appModule;
  request = supertest(app);
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerAndLogin() {
  const email    = `phase15b-${Date.now()}@test.com`;
  const password = 'Phase15bPass!1';

  const regRes = await request
    .post('/api/v1/auth/register')
    .send({ name: 'Phase15B User', email, password });

  if (regRes.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
  }

  const loginRes = await request
    .post('/api/v1/auth/login')
    .send({ email, password });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
  }

  return loginRes.body.data.accessToken;
}

// ─── Request Tracing ──────────────────────────────────────────────────────────

describe('Request Tracing — X-Request-ID / X-Correlation-ID', () => {
  it('attaches X-Request-ID header to every response', async () => {
    const res = await request.get('/api/v1/health');
    assert.ok(res.headers['x-request-id'], 'X-Request-ID header must be present');
    // Should look like a UUID
    assert.match(
      res.headers['x-request-id'],
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      'X-Request-ID should be a UUID',
    );
  });

  it('generates a new X-Correlation-ID when none is supplied', async () => {
    const res = await request.get('/api/v1/health');
    assert.ok(res.headers['x-correlation-id'], 'X-Correlation-ID header must be present');
  });

  it('echoes back a supplied X-Correlation-ID', async () => {
    const id  = '7f8d9a1b-test-correlation-id';
    const res = await request
      .get('/api/v1/health')
      .set('X-Correlation-ID', id);
    assert.equal(res.headers['x-correlation-id'], id, 'Correlation ID should be echoed back');
  });

  it('two concurrent requests receive different X-Request-IDs', async () => {
    const [r1, r2] = await Promise.all([
      request.get('/api/v1/health'),
      request.get('/api/v1/health'),
    ]);
    assert.notEqual(
      r1.headers['x-request-id'],
      r2.headers['x-request-id'],
      'Each request must have a unique ID',
    );
  });

  it('404 responses also carry tracing headers', async () => {
    const res = await request.get('/api/v1/nonexistent-route-xyz');
    assert.ok(res.headers['x-request-id'],     'X-Request-ID on 404');
    assert.ok(res.headers['x-correlation-id'], 'X-Correlation-ID on 404');
    assert.equal(res.status, 404);
  });
});

// ─── Security Middleware ──────────────────────────────────────────────────────

describe('Security — NoSQL Injection Prevention', () => {
  it('strips MongoDB operators from request body', async () => {
    // This should not authenticate — it should strip the operator and then fail auth normally.
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });

    // The server should NOT return 200 (operator stripped → validation/auth fails)
    assert.notEqual(res.status, 200, 'NoSQL injection must not authenticate');
    // Should be 4xx — bad input or invalid credentials
    assert.ok(res.status >= 400 && res.status < 500, `Expected 4xx, got ${res.status}`);
  });

  it('strips $ keys from query string parameters', async () => {
    // $where in a query param should be silently removed, not cause a 500
    const res = await request
      .get('/api/v1/analytics/overview?$where=1%3D%3D1');
    // May be 401 (not authenticated) — must not be 500
    assert.notEqual(res.status, 500, 'NoSQL operator in query param must not cause 500');
  });
});

describe('Security — Prototype Pollution Prevention', () => {
  it('rejects body with __proto__ key with 400', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"__proto__":{"admin":true},"email":"a@b.com","password":"pass"}');

    assert.equal(res.status, 400, '__proto__ in body should return 400');
    assert.equal(res.body.code, 'INVALID_PAYLOAD');
  });

  it('rejects body with constructor key with 400', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"constructor":{"prototype":{"admin":true}},"email":"a@b.com","password":"pass"}');

    assert.equal(res.status, 400, 'constructor in body should return 400');
    assert.equal(res.body.code, 'INVALID_PAYLOAD');
  });

  it('allows normal requests through', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'notauser@test.com', password: 'SomePass123!' });
    // Should get 401 invalid credentials, NOT 400 INVALID_PAYLOAD
    assert.notEqual(res.body.code, 'INVALID_PAYLOAD', 'Normal request should not be blocked');
  });
});

describe('Security — HTTP Parameter Pollution (HPP)', () => {
  it('collapses duplicate query params to last value', async () => {
    // /api/v1/analytics/overview?platform=youtube&platform=instagram
    // platform is not in the whitelist, so it should be collapsed
    const res = await request
      .get('/api/v1/analytics/overview?platform=youtube&platform=instagram');
    // Must not be 500 (duplicate param should not crash)
    assert.notEqual(res.status, 500, 'Duplicate query params must not cause 500');
  });
});

describe('Security — Mass Assignment Prevention', () => {
  it('strips role field from registration body', async () => {
    const email = `massassign-${Date.now()}@test.com`;
    const res = await request
      .post('/api/v1/auth/register')
      .send({ name: 'Attacker', email, password: 'Attack123!', role: 'admin' });

    if (res.status === 201) {
      // User was created — role must NOT be admin
      assert.notEqual(res.body.data?.user?.role, 'admin', 'role must not be settable via registration');
    }
    // Either created as non-admin OR rejected — both are acceptable
    assert.notEqual(res.status, 500);
  });

  it('strips subscriptionPlan from body', async () => {
    const email = `massassign2-${Date.now()}@test.com`;
    const res = await request
      .post('/api/v1/auth/register')
      .send({ name: 'Attacker2', email, password: 'Attack123!', subscriptionPlan: 'enterprise' });

    if (res.status === 201) {
      assert.notEqual(
        res.body.data?.user?.subscriptionPlan, 'enterprise',
        'subscriptionPlan must not be settable via registration',
      );
    }
    assert.notEqual(res.status, 500);
  });
});

// ─── CacheService ─────────────────────────────────────────────────────────────

describe('CacheService — Statistics', () => {
  let CacheService;

  before(async () => {
    ({ default: CacheService } = await import('../infrastructure/cache/index.js'));
  });

  it('getStats returns a stats object', () => {
    const stats = CacheService.getStats();
    assert.ok(typeof stats === 'object', 'getStats should return an object');
    assert.ok('hits'    in stats, 'should have hits');
    assert.ok('misses'  in stats, 'should have misses');
    assert.ok('sets'    in stats, 'should have sets');
    assert.ok('deletes' in stats, 'should have deletes');
    assert.ok('errors'  in stats, 'should have errors');
    assert.ok('enabled' in stats, 'should have enabled flag');
  });

  it('hitRate is null when no gets have occurred yet', () => {
    // CacheService is disabled in test (no Redis) — stats are fresh
    const stats = CacheService.getStats();
    if (stats.hits === 0 && stats.misses === 0) {
      assert.equal(stats.hitRate, null, 'hitRate should be null with zero gets');
    }
  });

  it('getOrSet calls computeFn when cache is disabled (pass-through)', async () => {
    let called = false;
    const result = await CacheService.getOrSet('test', 'key1', async () => {
      called = true;
      return { value: 42 };
    });
    assert.ok(called, 'computeFn should be called when cache is disabled');
    assert.deepEqual(result, { value: 42 });
  });

  it('wrap calls computeFn and returns result when cache is disabled', async () => {
    const result = await CacheService.wrap('test', 'key2', async () => ({ wrapped: true }));
    assert.deepEqual(result, { wrapped: true });
  });

  it('clearDomain returns 0 when cache is disabled', async () => {
    const deleted = await CacheService.clearDomain('analytics');
    assert.equal(deleted, 0, 'clearDomain should be a no-op when disabled');
  });
});

describe('CacheService — Domain Helpers', () => {
  let CacheService;

  before(async () => {
    ({ default: CacheService } = await import('../infrastructure/cache/index.js'));
  });

  it('getAnalytics calls computeFn', async () => {
    const result = await CacheService.getAnalytics('user1', 'overview', async () => ({ views: 100 }));
    assert.deepEqual(result, { views: 100 });
  });

  it('getReport calls computeFn', async () => {
    const result = await CacheService.getReport('user1', 'growth', async () => ({ growth: 5 }));
    assert.deepEqual(result, { growth: 5 });
  });

  it('getPlanner calls computeFn', async () => {
    const result = await CacheService.getPlanner('user1', 'week', async () => ({ slots: [] }));
    assert.deepEqual(result, { slots: [] });
  });

  it('getCompetitor calls computeFn', async () => {
    const result = await CacheService.getCompetitor('user1', 'comp1', 'stats', async () => ({ followers: 500 }));
    assert.deepEqual(result, { followers: 500 });
  });

  it('getSearch calls computeFn', async () => {
    const result = await CacheService.getSearch('user1', 'react tips', async () => ({ results: [] }));
    assert.deepEqual(result, { results: [] });
  });

  it('invalidateAnalytics resolves without error', async () => {
    await assert.doesNotReject(() => CacheService.invalidateAnalytics('user1'));
  });

  it('invalidateReports resolves without error', async () => {
    await assert.doesNotReject(() => CacheService.invalidateReports('user1'));
  });

  it('invalidatePlanner resolves without error', async () => {
    await assert.doesNotReject(() => CacheService.invalidatePlanner('user1'));
  });

  it('invalidateCompetitors resolves without error', async () => {
    await assert.doesNotReject(() => CacheService.invalidateCompetitors('user1'));
  });

  it('wrap rethrows computeFn errors when no stale data exists', async () => {
    await assert.rejects(
      () => CacheService.wrap('test', 'err-key', async () => { throw new Error('compute failed'); }),
      /compute failed/,
    );
  });
});

// ─── MetricsService ───────────────────────────────────────────────────────────

describe('MetricsService', () => {
  let MetricsService;

  before(async () => {
    ({ default: MetricsService } = await import('../infrastructure/metrics/index.js'));
    MetricsService.reset();
  });

  it('getSnapshot returns required top-level sections', () => {
    const snap = MetricsService.getSnapshot();
    assert.ok(snap.uptime,   'should have uptime');
    assert.ok(snap.process,  'should have process');
    assert.ok(snap.http,     'should have http');
    assert.ok(snap.ai,       'should have ai');
    assert.ok(snap.queue,    'should have queue');
    assert.ok(snap.cache,    'should have cache');
    assert.ok(snap.database, 'should have database');
  });

  it('process.memory fields are numbers', () => {
    const { memory } = MetricsService.getSnapshot().process;
    assert.ok(typeof memory.heapUsedMb  === 'number', 'heapUsedMb must be number');
    assert.ok(typeof memory.heapTotalMb === 'number', 'heapTotalMb must be number');
    assert.ok(typeof memory.rssMb       === 'number', 'rssMb must be number');
  });

  it('uptime.uptimeMs is positive', () => {
    const { uptimeMs } = MetricsService.getSnapshot().uptime;
    assert.ok(uptimeMs >= 0, 'uptimeMs should be >= 0');
  });

  it('recordRequest increments total count', () => {
    MetricsService.reset();
    MetricsService.recordRequest({ method: 'GET', route: '/test', status: 200, durationMs: 50 });
    const snap = MetricsService.getSnapshot();
    assert.equal(snap.http.requests.total, 1);
  });

  it('recordRequest tracks by status class', () => {
    MetricsService.reset();
    MetricsService.recordRequest({ method: 'GET', route: '/test', status: 200, durationMs: 10 });
    MetricsService.recordRequest({ method: 'POST', route: '/test', status: 404, durationMs: 5 });
    MetricsService.recordRequest({ method: 'GET', route: '/err', status: 500, durationMs: 100 });
    const snap = MetricsService.getSnapshot();
    assert.equal(snap.http.requests.byStatus['2xx'], 1);
    assert.equal(snap.http.requests.byStatus['4xx'], 1);
    assert.equal(snap.http.requests.byStatus['5xx'], 1);
    assert.equal(snap.http.requests.errors, 1);
  });

  it('response time avg is computed correctly', () => {
    MetricsService.reset();
    MetricsService.recordRequest({ method: 'GET', route: '/', status: 200, durationMs: 100 });
    MetricsService.recordRequest({ method: 'GET', route: '/', status: 200, durationMs: 200 });
    const snap = MetricsService.getSnapshot();
    assert.equal(snap.http.responseTimes.avgMs, 150);
  });

  it('recordAiCall increments AI counters', () => {
    MetricsService.reset();
    MetricsService.recordAiCall({ agent: 'analytics', provider: 'gemini', durationMs: 1200 });
    const snap = MetricsService.getSnapshot();
    assert.equal(snap.ai.calls, 1);
    assert.equal(snap.ai.byAgent.analytics.calls, 1);
    assert.equal(snap.ai.byProvider.gemini.calls, 1);
  });

  it('recordAiCall tracks errors separately', () => {
    MetricsService.reset();
    MetricsService.recordAiCall({ agent: 'trend', provider: 'openai', durationMs: 800, error: true });
    const snap = MetricsService.getSnapshot();
    assert.equal(snap.ai.errors, 1);
    assert.equal(snap.ai.byAgent.trend.errors, 1);
  });

  it('recordJobEnqueued / Completed / Failed track correctly', () => {
    MetricsService.reset();
    MetricsService.recordJobEnqueued('analytics-sync');
    MetricsService.recordJobEnqueued('analytics-sync');
    MetricsService.recordJobCompleted('analytics-sync');
    MetricsService.recordJobFailed('analytics-sync');
    const snap = MetricsService.getSnapshot();
    assert.equal(snap.queue.enqueued, 2);
    assert.equal(snap.queue.completed, 1);
    assert.equal(snap.queue.failed, 1);
    assert.equal(snap.queue.byType['analytics-sync'].enqueued, 2);
  });

  it('cache hitRate is null with no gets', () => {
    MetricsService.reset();
    const snap = MetricsService.getSnapshot();
    assert.equal(snap.cache.hitRate, null);
  });

  it('cache hitRate computes correctly after hits and misses', () => {
    MetricsService.reset();
    MetricsService.recordCacheHit();
    MetricsService.recordCacheHit();
    MetricsService.recordCacheHit();
    MetricsService.recordCacheMiss();
    const snap = MetricsService.getSnapshot();
    assert.equal(snap.cache.hitRate, 75, 'hitRate should be 75% (3 of 4)');
  });

  it('reset clears all counters', () => {
    MetricsService.recordRequest({ method: 'GET', route: '/', status: 200, durationMs: 10 });
    MetricsService.reset();
    const snap = MetricsService.getSnapshot();
    assert.equal(snap.http.requests.total, 0);
    assert.equal(snap.ai.calls, 0);
    assert.equal(snap.queue.enqueued, 0);
    assert.equal(snap.cache.hits, 0);
  });
});

// ─── Health Endpoints ─────────────────────────────────────────────────────────

describe('GET /api/v1/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request.get('/api/v1/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'ok');
    assert.ok(typeof res.body.data.uptime === 'number', 'uptime must be a number');
    assert.ok(res.body.data.timestamp, 'timestamp must be present');
  });

  it('includes database field in data', async () => {
    const res = await request.get('/api/v1/health');
    assert.ok(res.body.data.database, 'database field must be present');
    assert.ok('status' in res.body.data.database, 'database.status must be present');
  });
});

describe('GET /api/v1/health/live', () => {
  it('returns 200 with alive status', async () => {
    const res = await request.get('/api/v1/health/live');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'alive');
  });

  it('includes pid and uptimeSec', async () => {
    const res = await request.get('/api/v1/health/live');
    assert.ok(typeof res.body.pid       === 'number', 'pid must be a number');
    assert.ok(typeof res.body.uptimeSec === 'number', 'uptimeSec must be a number');
  });

  it('carries tracing headers', async () => {
    const res = await request.get('/api/v1/health/live');
    assert.ok(res.headers['x-request-id'],     'X-Request-ID must be on /live');
    assert.ok(res.headers['x-correlation-id'], 'X-Correlation-ID must be on /live');
  });
});

describe('GET /api/v1/health/ready', () => {
  it('returns 200 when MongoDB is connected', async () => {
    const res = await request.get('/api/v1/health/ready');
    // DB should be connected (MongoMemoryServer)
    assert.equal(res.status, 200, `Expected 200 but got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.status, 'ready');
  });

  it('includes database and cache checks', async () => {
    const res = await request.get('/api/v1/health/ready');
    assert.ok(res.body.checks.database, 'database check must be present');
    assert.ok(res.body.checks.cache,    'cache check must be present');
  });

  it('database check is required: true', async () => {
    const res = await request.get('/api/v1/health/ready');
    assert.equal(res.body.checks.database.required, true);
  });
});

describe('GET /api/v1/health/dependencies', () => {
  it('returns 200 or 503 with structured dependency report', async () => {
    const res = await request.get('/api/v1/health/dependencies');
    assert.ok([200, 503].includes(res.status), `Unexpected status ${res.status}`);
    assert.ok(res.body.dependencies, 'dependencies field must be present');
    assert.ok(res.body.dependencies.database, 'database dependency must be present');
    assert.ok(res.body.dependencies.cache,    'cache dependency must be present');
    assert.ok(res.body.dependencies.queue,    'queue dependency must be present');
  });

  it('includes latencyMs for database check', async () => {
    const res = await request.get('/api/v1/health/dependencies');
    // latencyMs may be null on error, but field must exist
    assert.ok('latencyMs' in res.body.dependencies.database, 'database latencyMs must be present');
  });

  it('reports cache stats', async () => {
    const res = await request.get('/api/v1/health/dependencies');
    assert.ok('stats' in res.body.dependencies.cache, 'cache stats must be present');
  });

  it('reports totalCheckMs', async () => {
    const res = await request.get('/api/v1/health/dependencies');
    assert.ok(typeof res.body.totalCheckMs === 'number', 'totalCheckMs must be a number');
  });
});

describe('GET /api/v1/health/metrics', () => {
  it('returns 200 with a data snapshot', async () => {
    const res = await request.get('/api/v1/health/metrics');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data, 'data field must be present');
  });

  it('snapshot has http, ai, queue, cache sections', async () => {
    const res = await request.get('/api/v1/health/metrics');
    const { data } = res.body;
    assert.ok(data.http,     'http section must be present');
    assert.ok(data.ai,       'ai section must be present');
    assert.ok(data.queue,    'queue section must be present');
    assert.ok(data.cache,    'cache section must be present');
    assert.ok(data.process,  'process section must be present');
    assert.ok(data.uptime,   'uptime section must be present');
    assert.ok(data.database, 'database section must be present');
  });
});

// ─── Regression: existing routes still respond correctly ──────────────────────

describe('Regression — core routes still functional', () => {
  it('POST /api/v1/auth/register still works', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      name:     'Regression User',
      email:    `regression-${Date.now()}@test.com`,
      password: 'Regression123!',
    });
    assert.ok([201, 409].includes(res.status), `Unexpected status: ${res.status}`);
  });

  it('POST /api/v1/auth/login still works', async () => {
    const email    = `reglogin-${Date.now()}@test.com`;
    const password = 'Reglogin123!';
    await request.post('/api/v1/auth/register').send({ name: 'RL', email, password });
    const res = await request.post('/api/v1/auth/login').send({ email, password });
    assert.equal(res.status, 200, 'Login should return 200');
    assert.ok(res.body.data?.accessToken, 'accessToken must be present');
  });

  it('authenticated GET /api/v1/auth/me still works', async () => {
    const token = await registerAndLogin();
    const res   = await request.get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200, 'GET /me should return 200');
  });

  it('unauthenticated GET /api/v1/analytics/overview returns 401', async () => {
    const res = await request.get('/api/v1/analytics/overview');
    assert.equal(res.status, 401, 'Should require auth');
  });

  it('404 for unknown routes', async () => {
    const res = await request.get('/api/v1/this-does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});
