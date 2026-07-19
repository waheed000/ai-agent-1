/**
 * plannerWorker
 * Processes async content planner generation jobs.
 */
import QueueService from '../../infrastructure/queue/index.js';
import PlannerService from '../../modules/content/PlannerService.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queues.js';
import logger from '../../utils/logger.js';

export function registerPlannerWorker() {
  QueueService.createWorker(QUEUE_NAMES.PLANNER, async (job) => {
    const { data } = job;

    logger.info('plannerWorker: processing job', {
      jobId: job.id,
      userId: data.userId,
      days: data.days,
    });

    try {
      const result = await PlannerService.generate(data.userId, {
        days:         data.days         || 7,
        platforms:    data.platforms    || ['instagram'],
        campaignName: data.campaignName || null,
      });

      logger.info('plannerWorker: planner generated', {
        jobId: job.id,
        userId: data.userId,
        count: result.generated,
      });

      return { success: true, generated: result.generated };
    } catch (err) {
      logger.error('plannerWorker: failed', { jobId: job.id, error: err.message });
      throw err;
    }
  });
}
