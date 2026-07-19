/**
 * ReportGenerated listener
 * Sends a notification when a report finishes generating.
 */
import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import QueueService from '../../infrastructure/queue/index.js';
import { QUEUE_NAMES } from '../../queues/queues.js';
import logger from '../../utils/logger.js';

export function registerReportGeneratedListener() {
  eventBus.on(EVENT_TYPES.REPORT_GENERATED, async ({ userId, reportId, type }) => {
    logger.info('Listener[ReportGenerated]: queueing notification', { userId, type });

    const notifType = type === 'monthly' ? 'monthly_report_ready' : 'weekly_report_ready';

    await QueueService.addJob(QUEUE_NAMES.NOTIFICATION, 'notification:process', {
      userId,
      type: notifType,
      refModel: 'GrowthReport',
      refId: reportId,
    });
  });
}
