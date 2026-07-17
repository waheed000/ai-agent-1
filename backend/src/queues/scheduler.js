/**
 * Scheduler
 * Registers all repeatable (cron) jobs and boots the workers.
 * Call initScheduler() once at server startup after QueueService.init().
 */

import QueueService from '../services/QueueService.js';
import { QUEUE_NAMES, JOB_NAMES } from './queues.js';
import { registerSocialSyncWorker }  from './workers/socialSyncWorker.js';
import { registerAnalyticsWorker }   from './workers/analyticsWorker.js';
import { registerTrendWorker }       from './workers/trendWorker.js';
import { registerReportWorker }      from './workers/reportWorker.js';
import { registerNotificationWorker } from './workers/notificationWorker.js';
import { registerPlannerWorker }     from './workers/plannerWorker.js';
import logger from '../utils/logger.js';

const SCHEDULE = [
  {
    queue:   QUEUE_NAMES.ANALYTICS,
    jobName: JOB_NAMES.RECALCULATE_ANALYTICS,
    data:    { type: 'all' },
    cron:    '0 * * * *',
    jobId:   'scheduled:analytics:hourly',
  },
  {
    queue:   QUEUE_NAMES.SOCIAL_SYNC,
    jobName: JOB_NAMES.FETCH_POSTS,
    data:    { scheduledRun: true },
    cron:    '0 */6 * * *',
    jobId:   'scheduled:sync:fetch-posts',
  },
  {
    queue:   QUEUE_NAMES.ANALYTICS,
    jobName: JOB_NAMES.RECALCULATE_ANALYTICS,
    data:    { type: 'all', deep: true },
    cron:    '0 0 * * *',
    jobId:   'scheduled:analytics:midnight',
  },
  {
    queue:   QUEUE_NAMES.TREND,
    jobName: JOB_NAMES.REFRESH_TRENDS,
    data:    {},
    cron:    '0 2 * * *',
    jobId:   'scheduled:trend:daily',
  },
  {
    queue:   QUEUE_NAMES.REPORT,
    jobName: JOB_NAMES.GENERATE_WEEKLY_REPORT,
    data:    {},
    cron:    '0 6 * * 1',         // Monday 06:00
    jobId:   'scheduled:report:weekly',
  },
  {
    queue:   QUEUE_NAMES.REPORT,
    jobName: JOB_NAMES.GENERATE_MONTHLY_REPORT,
    data:    {},
    cron:    '0 7 1 * *',         // 1st of every month 07:00
    jobId:   'scheduled:report:monthly',
  },
];

export async function initScheduler() {
  if (!QueueService.enabled) {
    logger.warn('Scheduler: QueueService disabled — skipping');
    return;
  }

  logger.info('Scheduler: registering workers');
  registerSocialSyncWorker();
  registerAnalyticsWorker();
  registerTrendWorker();
  registerReportWorker();
  registerNotificationWorker();
  registerPlannerWorker();

  logger.info('Scheduler: registering repeatable jobs', { count: SCHEDULE.length });
  for (const entry of SCHEDULE) {
    try {
      await QueueService.scheduleRepeatableJob(
        entry.queue, entry.jobName, entry.data, entry.cron, entry.jobId,
      );
    } catch (err) {
      logger.error('Scheduler: failed to schedule job', { job: entry.jobName, error: err.message });
    }
  }

  logger.info('Scheduler: initialisation complete');
}
