/**
 * AIReportGenerated listener
 * Handles post-generation tasks when an AI report is produced.
 */

import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import QueueService from '../../infrastructure/queue/index.js';
import { QUEUE_NAMES } from '../../queues/queues.js';
import logger from '../../utils/logger.js';

export function registerAIReportGeneratedListener() {
  eventBus.on(EVENT_TYPES.AI_REPORT_GENERATED, async ({ userId, results }) => {
    logger.info('Listener[AIReportGenerated]: AI report complete', {
      userId,
      sections: Object.keys(results || {}).filter((k) => results[k] !== null),
    });

    // Notify the user via notification queue
    await QueueService.addJob(QUEUE_NAMES.NOTIFICATION, 'notification:process', {
      userId,
      type: 'info',
      data: { message: 'Your AI growth analysis is ready.' },
    });
  });
}
