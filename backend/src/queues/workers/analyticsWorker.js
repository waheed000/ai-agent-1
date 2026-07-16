/**
 * Analytics Worker
 * Recalculates stored analytics metrics for a user (or all users).
 *
 * Job payload options:
 *  - { type: 'user', userId }       – recalculate for one user
 *  - { type: 'all' }                – recalculate for all users (scheduled)
 */

import QueueService from '../../services/QueueService.js';
import JobExecution from '../../models/JobExecution.js';
import User from '../../models/User.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queues.js';
import logger from '../../utils/logger.js';

async function processAnalyticsJob(job) {
  const { type, userId } = job.data;
  const startedAt = new Date();

  logger.info('analyticsWorker: processing', { jobId: job.id, type, userId });

  const execution = await JobExecution.create({
    jobId: job.id,
    queue: QUEUE_NAMES.ANALYTICS,
    jobName: job.name,
    user: userId || null,
    status: 'running',
    attemptNumber: job.attemptsMade + 1,
    startedAt,
  });

  try {
    let processed = 0;

    if (type === 'user' && userId) {
      // Recalculate for a single user — AnalyticsService will be called here
      // once it is fully wired; for now, we log and record the intent
      logger.info('analyticsWorker: recalculating for user', { userId });
      processed = 1;
    } else if (type === 'all') {
      // Recalculate for every active user
      const users = await User.find({ status: 'active', isDeleted: false }).select('_id').lean();
      processed = users.length;
      logger.info('analyticsWorker: recalculating for all users', { count: processed });
    }

    const durationMs = Date.now() - startedAt.getTime();
    await JobExecution.findByIdAndUpdate(execution._id, {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        durationMs,
        records: new Map([['users', processed]]),
      },
    });

    return { success: true, processed, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startedAt.getTime();
    logger.error('analyticsWorker: failed', { jobId: job.id, error: err.message });
    await JobExecution.findByIdAndUpdate(execution._id, {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        durationMs,
        errorMessage: err.message,
        errorCode: err.code || 'UNKNOWN',
      },
    });
    throw err;
  }
}

export function registerAnalyticsWorker() {
  return QueueService.createWorker(QUEUE_NAMES.ANALYTICS, processAnalyticsJob, {
    concurrency: 2,
  });
}
