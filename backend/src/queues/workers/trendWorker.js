/**
 * Trend Worker
 * Refreshes trend data snapshots (platform-level, not AI-driven).
 *
 * Job payload: { platform? }  — omit to refresh all platforms
 */

import QueueService from '../../infrastructure/queue/index.js';
import JobExecution from '../../models/JobExecution.js';
import TrendData from '../../models/TrendData.js';
import { QUEUE_NAMES } from '../queues.js';
import logger from '../../utils/logger.js';

async function processTrendJob(job) {
  const { platform } = job.data;
  const startedAt = new Date();

  logger.info('trendWorker: processing', { jobId: job.id, platform });

  const execution = await JobExecution.create({
    jobId: job.id,
    queue: QUEUE_NAMES.TREND,
    jobName: job.name,
    platform: platform || null,
    status: 'running',
    attemptNumber: job.attemptsMade + 1,
    startedAt,
  });

  try {
    // Trend refresh logic will be implemented when the trend data pipeline is built.
    // For now we log, record metadata, and mark complete.
    const durationMs = Date.now() - startedAt.getTime();

    logger.info('trendWorker: trend refresh complete', { jobId: job.id, platform, durationMs });

    await JobExecution.findByIdAndUpdate(execution._id, {
      $set: { status: 'completed', completedAt: new Date(), durationMs },
    });

    return { success: true, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startedAt.getTime();
    logger.error('trendWorker: failed', { jobId: job.id, error: err.message });
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

export function registerTrendWorker() {
  return QueueService.createWorker(QUEUE_NAMES.TREND, processTrendJob, {
    concurrency: 1,
  });
}
