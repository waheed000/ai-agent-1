/**
 * Scheduler
 * Registers all repeatable (cron) jobs and boots the workers.
 * Call initScheduler() once at server startup after QueueService.init().
 *
 * Schedule overview:
 *  - Every hour         → refresh social analytics (analytics:recalculate all)
 *  - Every 6 hours      → fetch new posts (sync all active connected accounts)
 *  - Midnight daily     → calculate growth metrics
 *  - Every day          → refresh trend data
 *  - Every Monday 06:00 → generate weekly reports
 */

import QueueService from '../services/QueueService.js';
import { QUEUE_NAMES, JOB_NAMES } from './queues.js';
import { registerSocialSyncWorker } from './workers/socialSyncWorker.js';
import { registerAnalyticsWorker } from './workers/analyticsWorker.js';
import { registerTrendWorker } from './workers/trendWorker.js';
import { registerReportWorker } from './workers/reportWorker.js';
import { registerNotificationWorker } from './workers/notificationWorker.js';
import logger from '../utils/logger.js';

/** Stable job IDs prevent duplicate repeatable entries across restarts. */
const SCHEDULE = [
  {
    queue: QUEUE_NAMES.ANALYTICS,
    jobName: JOB_NAMES.RECALCULATE_ANALYTICS,
    data: { type: 'all' },
    cron: '0 * * * *',          // every hour
    jobId: 'scheduled:analytics:hourly',
  },
  {
    queue: QUEUE_NAMES.SOCIAL_SYNC,
    jobName: JOB_NAMES.FETCH_POSTS,
    data: { scheduledRun: true },
    cron: '0 */6 * * *',         // every 6 hours
    jobId: 'scheduled:sync:fetch-posts',
  },
  {
    queue: QUEUE_NAMES.ANALYTICS,
    jobName: JOB_NAMES.RECALCULATE_ANALYTICS,
    data: { type: 'all', deep: true },
    cron: '0 0 * * *',           // midnight daily — deep recalculation
    jobId: 'scheduled:analytics:midnight',
  },
  {
    queue: QUEUE_NAMES.TREND,
    jobName: JOB_NAMES.REFRESH_TRENDS,
    data: {},
    cron: '0 2 * * *',           // daily at 02:00
    jobId: 'scheduled:trend:daily',
  },
  {
    queue: QUEUE_NAMES.REPORT,
    jobName: JOB_NAMES.GENERATE_WEEKLY_REPORT,
    data: {},                     // weekStartDate added at runtime
    cron: '0 6 * * 1',           // every Monday at 06:00
    jobId: 'scheduled:report:weekly',
  },
];

/**
 * Register workers and repeatable jobs.
 * Safe to call multiple times — workers are registered only once.
 */
export async function initScheduler() {
  if (!QueueService.enabled) {
    logger.warn('Scheduler: QueueService is disabled — skipping worker registration and scheduling');
    return;
  }

  logger.info('Scheduler: registering workers');
  registerSocialSyncWorker();
  registerAnalyticsWorker();
  registerTrendWorker();
  registerReportWorker();
  registerNotificationWorker();

  logger.info('Scheduler: registering repeatable jobs', { count: SCHEDULE.length });

  for (const entry of SCHEDULE) {
    try {
      await QueueService.scheduleRepeatableJob(
        entry.queue,
        entry.jobName,
        entry.data,
        entry.cron,
        entry.jobId
      );
      logger.info('Scheduler: job scheduled', {
        queue: entry.queue,
        job: entry.jobName,
        cron: entry.cron,
      });
    } catch (err) {
      logger.error('Scheduler: failed to schedule job', {
        job: entry.jobName,
        error: err.message,
      });
    }
  }

  logger.info('Scheduler: initialisation complete');
}
