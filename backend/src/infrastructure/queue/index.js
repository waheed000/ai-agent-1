/**
 * QueueService
 * Central BullMQ abstraction. Manages the Redis connection, queue instances,
 * and workers. The rest of the codebase never touches BullMQ or ioredis directly.
 *
 * If Redis is unavailable at startup, the service degrades gracefully:
 * all queue operations become no-ops and a warning is logged.
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

/** Exponential backoff with jitter: delay = base * 2^attempt + rand(0..1000) ms */
const buildBackoff = () => ({
  type: 'custom',
  settings: {},
  strategy: (attemptsMade) => {
    const exp    = Math.min(config.queue.retryBaseMs * Math.pow(2, attemptsMade), config.queue.retryMaxMs);
    const jitter = Math.floor(Math.random() * 1_000);
    return exp + jitter;
  },
});

class QueueService {
  constructor() {
    /** @type {Redis|null} */
    this.connection = null;
    /** @type {Map<string, Queue>} */
    this._queues = new Map();
    /** @type {Map<string, Worker>} */
    this._workers = new Map();
    /** @type {Map<string, QueueEvents>} */
    this._events = new Map();
    this.enabled = false;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Connect to Redis. Must be called once at server startup.
   * Sets this.enabled = true on success; logs a warning and continues on failure.
   */
  async init() {
    try {
      this.connection = new Redis({
        host:               config.redis.host,
        port:               config.redis.port,
        password:           config.redis.password,
        db:                 config.redis.db,
        maxRetriesPerRequest: null, // required by BullMQ
        enableReadyCheck:   false,
        lazyConnect:        true,
      });

      await this.connection.connect();
      await this.connection.ping();
      this.enabled = true;
      logger.info('QueueService: Redis connected', {
        host: config.redis.host,
        port: config.redis.port,
      });
    } catch (err) {
      logger.warn('QueueService: Redis unavailable — background jobs disabled', {
        error: err.message,
        host:  config.redis.host,
        port:  config.redis.port,
      });
      this.connection = null;
      this.enabled    = false;
    }
  }

  /**
   * Close all workers, queues, and the Redis connection.
   * Safe to call even when disabled.
   */
  async shutdown() {
    logger.info('QueueService: shutting down');

    for (const [name, worker] of this._workers) {
      try {
        await worker.close();
        logger.debug(`QueueService: worker "${name}" closed`);
      } catch (err) {
        logger.warn(`QueueService: error closing worker "${name}"`, { error: err.message });
      }
    }

    for (const [name, events] of this._events) {
      try {
        await events.close();
      } catch (err) {
        logger.warn(`QueueService: error closing QueueEvents "${name}"`, { error: err.message });
      }
    }

    for (const [name, queue] of this._queues) {
      try {
        await queue.close();
        logger.debug(`QueueService: queue "${name}" closed`);
      } catch (err) {
        logger.warn(`QueueService: error closing queue "${name}"`, { error: err.message });
      }
    }

    if (this.connection) {
      try { this.connection.disconnect(); } catch { /* ignore */ }
    }

    this._workers.clear();
    this._queues.clear();
    this._events.clear();
    logger.info('QueueService: shutdown complete');
  }

  // ─── Queue management ─────────────────────────────────────────────────────

  /**
   * Get or create a named queue. Returns null when disabled.
   * @param {string} name
   * @param {import('bullmq').QueueOptions} [options]
   * @returns {Queue|null}
   */
  getQueue(name, options = {}) {
    if (!this.enabled) return null;

    if (!this._queues.has(name)) {
      const queue = new Queue(name, {
        connection: this._makeConnection(),
        defaultJobOptions: {
          attempts: config.queue.defaultAttempts,
          backoff:  buildBackoff(),
          removeOnComplete: config.queue.removeOnComplete,
          removeOnFail:     config.queue.removeOnFail,
        },
        ...options,
      });

      queue.on('error', (err) => {
        logger.error(`Queue "${name}" error`, { error: err.message });
      });

      this._queues.set(name, queue);
      logger.debug(`QueueService: queue "${name}" created`);
    }

    return this._queues.get(name);
  }

  /**
   * Add a job to a named queue. No-op when disabled; returns null.
   * @param {string} queueName
   * @param {string} jobName
   * @param {object} data
   * @param {import('bullmq').JobsOptions} [opts]
   */
  async addJob(queueName, jobName, data, opts = {}) {
    if (!this.enabled) return null;
    const queue = this.getQueue(queueName);
    if (!queue) return null;
    const job = await queue.add(jobName, data, opts);
    logger.debug('QueueService: job added', { queue: queueName, job: jobName, id: job.id });
    return job;
  }

  /**
   * Register a repeatable (scheduled) job. Idempotent — safe to call on every server start.
   * @param {string} queueName
   * @param {string} jobName
   * @param {object} data
   * @param {string} pattern  Cron expression
   * @param {string} [jobId]  Stable ID to prevent duplicates
   */
  async scheduleRepeatableJob(queueName, jobName, data, pattern, jobId) {
    if (!this.enabled) return null;
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    const opts = {
      repeat: { pattern },
      ...(jobId && { jobId }),
    };

    const job = await queue.add(jobName, data, opts);
    logger.info('QueueService: repeatable job scheduled', {
      queue: queueName, job: jobName, cron: pattern,
    });
    return job;
  }

  // ─── Worker management ────────────────────────────────────────────────────

  /**
   * Create and register a worker for a queue.
   * @param {string}   queueName
   * @param {Function} processor  async (job) => result
   * @param {import('bullmq').WorkerOptions} [options]
   * @returns {Worker|null}
   */
  createWorker(queueName, processor, options = {}) {
    if (!this.enabled) return null;

    if (this._workers.has(queueName)) {
      logger.warn(`QueueService: worker for "${queueName}" already registered — skipping`);
      return this._workers.get(queueName);
    }

    const worker = new Worker(queueName, processor, {
      connection:  this._makeConnection(),
      concurrency: config.queue.concurrency,
      ...options,
    });

    worker.on('active', (job) => {
      logger.info('Job started', { queue: queueName, job: job.name, id: job.id });
    });

    worker.on('completed', (job, result) => {
      logger.info('Job completed', {
        queue:      queueName,
        job:        job.name,
        id:         job.id,
        durationMs: Date.now() - job.timestamp,
        records:    result?.records,
      });
    });

    worker.on('failed', (job, err) => {
      logger.error('Job failed', {
        queue:   queueName,
        job:     job?.name,
        id:      job?.id,
        attempt: job?.attemptsMade,
        error:   err.message,
      });
    });

    worker.on('error', (err) => {
      logger.error(`Worker "${queueName}" error`, { error: err.message });
    });

    this._workers.set(queueName, worker);
    logger.info(`QueueService: worker for "${queueName}" registered`);
    return worker;
  }

  // ─── Health & monitoring ──────────────────────────────────────────────────

  /** @returns {Promise<{status: string, redis: boolean, queues: string[]}>} */
  async getHealth() {
    if (!this.enabled) return { status: 'degraded', redis: false, queues: [] };
    try {
      await this.connection.ping();
      return { status: 'healthy', redis: true, queues: Array.from(this._queues.keys()) };
    } catch (err) {
      return { status: 'unhealthy', redis: false, queues: [], error: err.message };
    }
  }

  /**
   * Return job counts for every registered queue.
   * @returns {Promise<Array<{name: string, waiting: number, active: number, completed: number, failed: number, delayed: number}>>}
   */
  async getQueueStats() {
    if (!this.enabled) return [];

    const stats = [];
    for (const [name, queue] of this._queues) {
      try {
        const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
        stats.push({ name, ...counts });
      } catch (err) {
        stats.push({ name, error: err.message });
      }
    }
    return stats;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  /** Create a fresh ioredis connection (BullMQ requires separate connections per Queue/Worker). */
  _makeConnection() {
    return new Redis({
      host:               config.redis.host,
      port:               config.redis.port,
      password:           config.redis.password,
      db:                 config.redis.db,
      maxRetriesPerRequest: null,
      enableReadyCheck:   false,
    });
  }
}

export default new QueueService();
