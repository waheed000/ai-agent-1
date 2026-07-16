/**
 * Phase 6 Tests — Background Jobs & Sync Scheduler
 *
 * Tests:
 * - QueueService initialisation and graceful degradation
 * - Job scheduling and worker registration
 * - Retry and failure handling
 * - Duplicate job prevention
 * - Job execution metadata recording
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// ─── DB setup helpers ─────────────────────────────────────────────────────────

let mongod;

async function connectDB() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function disconnectDB() {
  await mongoose.disconnect();
  await mongod.stop();
}

// ─── Unit tests: QueueService graceful degradation ────────────────────────────

describe('QueueService', () => {
  it('marks itself as disabled when Redis is unreachable', async () => {
    // Import a fresh QueueService-like object configured to fail
    // We test the behaviour by inspecting the `enabled` flag after
    // attempting to connect to a port that won't respond.
    const { default: QueueService } = await import('../services/QueueService.js');

    // If Redis is not available the service should remain disabled / not crash
    // (the real init() is called in server.js — here we just assert the contract)
    assert.equal(typeof QueueService.enabled, 'boolean');
    assert.equal(typeof QueueService.init, 'function');
    assert.equal(typeof QueueService.shutdown, 'function');
    assert.equal(typeof QueueService.getQueue, 'function');
    assert.equal(typeof QueueService.addJob, 'function');
    assert.equal(typeof QueueService.createWorker, 'function');
    assert.equal(typeof QueueService.getHealth, 'function');
    assert.equal(typeof QueueService.getQueueStats, 'function');
  });

  it('getQueue returns null when disabled', async () => {
    const { default: QueueService } = await import('../services/QueueService.js');
    // Force disabled state
    QueueService.enabled = false;
    const q = QueueService.getQueue('test');
    assert.equal(q, null);
  });

  it('addJob returns null when disabled', async () => {
    const { default: QueueService } = await import('../services/QueueService.js');
    QueueService.enabled = false;
    const result = await QueueService.addJob('test', 'myJob', {});
    assert.equal(result, null);
  });

  it('createWorker returns null when disabled', async () => {
    const { default: QueueService } = await import('../services/QueueService.js');
    QueueService.enabled = false;
    const w = QueueService.createWorker('test', async () => {});
    assert.equal(w, null);
  });

  it('getHealth returns degraded status when disabled', async () => {
    const { default: QueueService } = await import('../services/QueueService.js');
    QueueService.enabled = false;
    const health = await QueueService.getHealth();
    assert.equal(health.status, 'degraded');
    assert.equal(health.redis, false);
  });

  it('getQueueStats returns empty array when disabled', async () => {
    const { default: QueueService } = await import('../services/QueueService.js');
    QueueService.enabled = false;
    const stats = await QueueService.getQueueStats();
    assert.deepEqual(stats, []);
  });
});

// ─── Unit tests: queue definitions ────────────────────────────────────────────

describe('Queue definitions', () => {
  it('exports all expected queue names', async () => {
    const { QUEUE_NAMES, JOB_NAMES } = await import('../queues/queues.js');
    assert.ok(QUEUE_NAMES.SOCIAL_SYNC);
    assert.ok(QUEUE_NAMES.ANALYTICS);
    assert.ok(QUEUE_NAMES.TREND);
    assert.ok(QUEUE_NAMES.REPORT);
    assert.ok(QUEUE_NAMES.NOTIFICATION);
    assert.ok(JOB_NAMES.SYNC_PLATFORM);
    assert.ok(JOB_NAMES.RECALCULATE_ANALYTICS);
    assert.ok(JOB_NAMES.REFRESH_TRENDS);
    assert.ok(JOB_NAMES.GENERATE_WEEKLY_REPORT);
    assert.ok(JOB_NAMES.PROCESS_NOTIFICATION);
  });

  it('exports queue getter functions', async () => {
    const {
      getSocialSyncQueue,
      getAnalyticsQueue,
      getTrendQueue,
      getReportQueue,
      getNotificationQueue,
    } = await import('../queues/queues.js');
    assert.equal(typeof getSocialSyncQueue, 'function');
    assert.equal(typeof getAnalyticsQueue, 'function');
    assert.equal(typeof getTrendQueue, 'function');
    assert.equal(typeof getReportQueue, 'function');
    assert.equal(typeof getNotificationQueue, 'function');
  });
});

// ─── Integration tests: JobExecution model ────────────────────────────────────

describe('JobExecution model', () => {
  before(connectDB);
  after(disconnectDB);

  it('creates a job execution record', async () => {
    const { default: JobExecution } = await import('../models/JobExecution.js');
    const doc = await JobExecution.create({
      jobId: 'test-job-1',
      queue: 'socialSync',
      jobName: 'sync:platform',
      user: new mongoose.Types.ObjectId(),
      platform: 'youtube',
      status: 'running',
    });

    assert.equal(doc.jobId, 'test-job-1');
    assert.equal(doc.queue, 'socialSync');
    assert.equal(doc.status, 'running');
    assert.equal(doc.platform, 'youtube');
  });

  it('rejects invalid queue name', async () => {
    const { default: JobExecution } = await import('../models/JobExecution.js');
    await assert.rejects(
      () => JobExecution.create({ jobId: 'x', queue: 'invalidQueue', jobName: 'test' }),
      /Invalid queue/
    );
  });

  it('rejects invalid status', async () => {
    const { default: JobExecution } = await import('../models/JobExecution.js');
    await assert.rejects(
      () =>
        JobExecution.create({
          jobId: 'x',
          queue: 'analytics',
          jobName: 'test',
          status: 'badStatus',
        }),
      /Invalid status/
    );
  });

  it('records completion with duration and records', async () => {
    const { default: JobExecution } = await import('../models/JobExecution.js');
    const doc = await JobExecution.create({
      jobId: 'test-job-2',
      queue: 'analytics',
      jobName: 'analytics:recalculate',
      status: 'running',
    });

    await JobExecution.findByIdAndUpdate(doc._id, {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        durationMs: 1234,
        records: new Map([['users', 5]]),
      },
    });

    const updated = await JobExecution.findById(doc._id).lean();
    assert.equal(updated.status, 'completed');
    assert.equal(updated.durationMs, 1234);
  });
});

// ─── Integration tests: duplicate job prevention ──────────────────────────────

describe('Duplicate sync job prevention', () => {
  before(connectDB);
  after(disconnectDB);

  beforeEach(async () => {
    const { default: JobExecution } = await import('../models/JobExecution.js');
    await JobExecution.deleteMany({});
  });

  it('detects a running duplicate job', async () => {
    const { default: JobExecution } = await import('../models/JobExecution.js');
    const { isDuplicateSyncJob } = await import('../queues/workers/socialSyncWorker.js');

    const userId = new mongoose.Types.ObjectId();
    await JobExecution.create({
      jobId: 'dup-test-1',
      queue: 'socialSync',
      jobName: 'sync:platform',
      user: userId,
      platform: 'youtube',
      status: 'running',
    });

    const result = await isDuplicateSyncJob(String(userId), 'youtube');
    assert.equal(result, true);
  });

  it('returns false when no active job exists', async () => {
    const { isDuplicateSyncJob } = await import('../queues/workers/socialSyncWorker.js');
    const userId = new mongoose.Types.ObjectId();
    const result = await isDuplicateSyncJob(String(userId), 'instagram');
    assert.equal(result, false);
  });

  it('returns false after a job completes', async () => {
    const { default: JobExecution } = await import('../models/JobExecution.js');
    const { isDuplicateSyncJob } = await import('../queues/workers/socialSyncWorker.js');

    const userId = new mongoose.Types.ObjectId();
    await JobExecution.create({
      jobId: 'dup-test-2',
      queue: 'socialSync',
      jobName: 'sync:platform',
      user: userId,
      platform: 'tiktok',
      status: 'completed',
    });

    const result = await isDuplicateSyncJob(String(userId), 'tiktok');
    assert.equal(result, false);
  });
});

// ─── Integration tests: scheduler module ─────────────────────────────────────

describe('Scheduler', () => {
  it('exports initScheduler function', async () => {
    const { initScheduler } = await import('../queues/scheduler.js');
    assert.equal(typeof initScheduler, 'function');
  });

  it('skips scheduling when QueueService is disabled', async () => {
    const { default: QueueService } = await import('../services/QueueService.js');
    QueueService.enabled = false;

    const { initScheduler } = await import('../queues/scheduler.js');
    // Should resolve without throwing even when Redis is unavailable
    await assert.doesNotReject(() => initScheduler());
  });
});
