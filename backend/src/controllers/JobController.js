/**
 * JobController
 * Handles queue health/status endpoints and manual job triggers.
 */

import QueueService from '../services/QueueService.js';
import { isDuplicateSyncJob } from '../queues/workers/socialSyncWorker.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queues/queues.js';
import JobExecution from '../models/JobExecution.js';
import { success, serverError, conflict, badRequest } from '../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

const JobController = {
  /**
   * GET /api/v1/jobs/health
   * Overall queue system health.
   */
  async getHealth(req, res) {
    try {
      const health = await QueueService.getHealth();
      return success(res, health, 'Queue health retrieved');
    } catch (err) {
      logger.error('JobController.getHealth failed', { error: err.message });
      return serverError(res, 'Failed to retrieve queue health');
    }
  },

  /**
   * GET /api/v1/jobs/queues
   * Per-queue job counts.
   */
  async getQueues(req, res) {
    try {
      const stats = await QueueService.getQueueStats();
      return success(res, stats, 'Queue statistics retrieved');
    } catch (err) {
      logger.error('JobController.getQueues failed', { error: err.message });
      return serverError(res, 'Failed to retrieve queue statistics');
    }
  },

  /**
   * POST /api/v1/jobs/platforms/:platform/sync
   * Manually trigger a sync job for the authenticated user's platform.
   * Rejects if a sync job is already active for this user+platform.
   */
  async triggerSync(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, 'Validation failed', errors.array());
    }

    const userId = String(req.user._id);
    const { platform } = req.params;

    try {
      // Duplicate prevention
      const duplicate = await isDuplicateSyncJob(userId, platform);
      if (duplicate) {
        return conflict(res, `A sync job for ${platform} is already running`);
      }

      if (!QueueService.enabled) {
        return serverError(res, 'Background job system is currently unavailable');
      }

      const job = await QueueService.addJob(
        QUEUE_NAMES.SOCIAL_SYNC,
        JOB_NAMES.SYNC_PLATFORM,
        { userId, platform },
        { attempts: 3 }
      );

      logger.info('JobController: sync job triggered', {
        userId,
        platform,
        jobId: job?.id,
      });

      return success(
        res,
        { jobId: job?.id, platform, status: 'queued' },
        `Sync job for ${platform} queued successfully`
      );
    } catch (err) {
      logger.error('JobController.triggerSync failed', {
        userId,
        platform,
        error: err.message,
      });
      return serverError(res, 'Failed to queue sync job');
    }
  },

  /**
   * GET /api/v1/jobs/history
   * Recent job executions for the authenticated user.
   */
  async getHistory(req, res) {
    const userId = String(req.user._id);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const queue = req.query.queue || null;

    try {
      const filter = {
        user: userId,
        ...(queue && { queue }),
      };

      const executions = await JobExecution.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return success(res, executions, 'Job history retrieved', { count: executions.length });
    } catch (err) {
      logger.error('JobController.getHistory failed', { error: err.message });
      return serverError(res, 'Failed to retrieve job history');
    }
  },
};

export default JobController;
