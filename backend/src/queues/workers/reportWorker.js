/**
 * Report Worker
 * Generates weekly growth reports for all users.
 *
 * Job payload: { weekStartDate: ISO string }
 */

import QueueService from '../../services/QueueService.js';
import JobExecution from '../../models/JobExecution.js';
import User from '../../models/User.js';
import GrowthReport from '../../models/GrowthReport.js';
import { QUEUE_NAMES } from '../queues.js';
import logger from '../../utils/logger.js';

async function processReportJob(job) {
  const { weekStartDate } = job.data;
  const startedAt = new Date();

  logger.info('reportWorker: processing weekly reports', { jobId: job.id, weekStartDate });

  const execution = await JobExecution.create({
    jobId: job.id,
    queue: QUEUE_NAMES.REPORT,
    jobName: job.name,
    status: 'running',
    attemptNumber: job.attemptsMade + 1,
    startedAt,
    meta: { weekStartDate },
  });

  try {
    const users = await User.find({ status: 'active', isDeleted: false }).select('_id').lean();

    logger.info('reportWorker: generating weekly reports', {
      userCount: users.length,
      weekStartDate,
    });

    // Report generation for each user will be implemented when GrowthReport
    // builder service is ready. Skeleton logs intent and counts.
    const durationMs = Date.now() - startedAt.getTime();

    await JobExecution.findByIdAndUpdate(execution._id, {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        durationMs,
        records: new Map([['users', users.length]]),
        meta: { weekStartDate, userCount: users.length },
      },
    });

    return { success: true, usersProcessed: users.length, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startedAt.getTime();
    logger.error('reportWorker: failed', { jobId: job.id, error: err.message });
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

export function registerReportWorker() {
  return QueueService.createWorker(QUEUE_NAMES.REPORT, processReportJob, {
    concurrency: 1,
  });
}
