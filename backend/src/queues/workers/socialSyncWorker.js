/**
 * Social Sync Worker
 * Processes platform synchronization jobs from the socialSync queue.
 *
 * Each job payload: { userId, platform }
 *
 * Responsibilities:
 *  - Validate the connected account exists
 *  - Delegate the full sync pipeline to SyncService
 *  - Record job metadata in JobExecution
 *  - Classify errors as retryable vs. auth errors (no retry)
 *  - Prevent duplicate active jobs for the same user+platform
 */

import QueueService from '../../services/QueueService.js';
import SyncService from '../../services/SyncService.js';
import JobExecution from '../../models/JobExecution.js';
import ConnectedAccountRepository from '../../repositories/ConnectedAccountRepository.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queues.js';
import logger from '../../utils/logger.js';

// Error codes that indicate an auth problem — do not retry these
const AUTH_ERROR_CODES = new Set(['AUTH_ERROR', 'AUTHENTICATION_ERROR', 'AUTHORIZATION_ERROR']);
// Transient error codes that warrant a retry
const RETRYABLE_ERROR_CODES = new Set([
  'PLATFORM_ERROR',
  'NETWORK_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'ECONNRESET',
  'ETIMEDOUT',
]);

/**
 * Main processor function registered with BullMQ.
 * @param {import('bullmq').Job} job
 */
async function processSyncJob(job) {
  const { userId, platform } = job.data;
  const startedAt = new Date();

  logger.info('socialSyncWorker: processing', {
    jobId: job.id,
    userId,
    platform,
    attempt: job.attemptsMade + 1,
  });

  // Record job start
  const execution = await JobExecution.create({
    jobId: job.id,
    queue: QUEUE_NAMES.SOCIAL_SYNC,
    jobName: job.name,
    user: userId,
    platform,
    status: 'running',
    attemptNumber: job.attemptsMade + 1,
    startedAt,
  });

  try {
    // Validate the connected account still exists
    const account = await ConnectedAccountRepository.findByUserAndPlatform(userId, platform);
    if (!account) {
      // Do not retry — the account is gone
      await _finalise(execution, 'failed', { errorMessage: `No connected account for ${platform}` });
      const err = new Error(`Connected account not found: ${platform}`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (account.status === 'revoked') {
      await _finalise(execution, 'failed', { errorMessage: 'Account revoked — reauthorization required' });
      const err = new Error('Account is revoked');
      err.code = 'AUTH_ERROR';
      throw err;
    }

    // Run the full sync pipeline
    const result = await SyncService.sync(userId, platform);

    const durationMs = Date.now() - startedAt.getTime();
    await _finalise(execution, 'completed', {
      records: result.records,
      durationMs,
      meta: { syncStatus: result.status, errors: result.errors },
    });

    logger.info('socialSyncWorker: sync complete', {
      jobId: job.id,
      userId,
      platform,
      durationMs,
      records: result.records,
    });

    return { success: true, records: result.records, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startedAt.getTime();
    const isAuthError = AUTH_ERROR_CODES.has(err.code);
    const isRetryable =
      !isAuthError &&
      (RETRYABLE_ERROR_CODES.has(err.code) || job.attemptsMade + 1 < (job.opts?.attempts ?? 3));

    logger.error('socialSyncWorker: sync failed', {
      jobId: job.id,
      userId,
      platform,
      attempt: job.attemptsMade + 1,
      error: err.message,
      code: err.code,
      isRetryable,
      isAuthError,
    });

    // Mark account as needing reauth for auth errors
    if (isAuthError) {
      try {
        await ConnectedAccountRepository.updateByUserAndPlatform(userId, platform, {
          status: 'expired',
          syncError: 'Reauthorization required',
        });
      } catch (updateErr) {
        logger.warn('socialSyncWorker: failed to update account status', {
          error: updateErr.message,
        });
      }
    }

    await _finalise(execution, isRetryable ? 'retrying' : 'failed', {
      errorMessage: err.message,
      errorCode: err.code || 'UNKNOWN',
      durationMs,
    });

    // Re-throw to let BullMQ handle retries / failure recording
    throw err;
  }
}

async function _finalise(execution, status, updates = {}) {
  try {
    const { records, durationMs, errorMessage, errorCode, meta } = updates;
    await JobExecution.findByIdAndUpdate(execution._id, {
      $set: {
        status,
        completedAt: new Date(),
        ...(durationMs !== undefined && { durationMs }),
        ...(records && { records: new Map(Object.entries(records)) }),
        ...(errorMessage && { errorMessage }),
        ...(errorCode && { errorCode }),
        ...(meta && { meta }),
      },
    });
  } catch (err) {
    logger.warn('socialSyncWorker: failed to finalise JobExecution', { error: err.message });
  }
}

/**
 * Register the worker with QueueService.
 * Called once from the scheduler/startup.
 */
export function registerSocialSyncWorker() {
  return QueueService.createWorker(QUEUE_NAMES.SOCIAL_SYNC, processSyncJob, {
    concurrency: 3,
    limiter: { max: 10, duration: 60_000 }, // max 10 jobs/minute to respect rate limits
  });
}

/**
 * Check whether a sync job is already active for this user+platform.
 * Used to prevent duplicate jobs.
 *
 * @param {string} userId
 * @param {string} platform
 * @returns {Promise<boolean>}
 */
export async function isDuplicateSyncJob(userId, platform) {
  const existing = await JobExecution.findOne({
    user: userId,
    platform,
    queue: QUEUE_NAMES.SOCIAL_SYNC,
    status: { $in: ['pending', 'running'] },
  });
  return !!existing;
}
