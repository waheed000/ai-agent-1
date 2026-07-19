/**
 * GrowthPlanGenerated listener
 * Queues a notification when a growth plan is ready.
 */

import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import QueueService from '../../infrastructure/queue/index.js';
import { QUEUE_NAMES } from '../../queues/queues.js';
import logger from '../../utils/logger.js';

export function registerGrowthPlanGeneratedListener() {
  eventBus.on(EVENT_TYPES.GROWTH_PLAN_GENERATED, async ({ userId }) => {
    logger.info('Listener[GrowthPlanGenerated]: growth plan ready', { userId });

    await QueueService.addJob(QUEUE_NAMES.NOTIFICATION, 'notification:process', {
      userId,
      type: 'milestone',
      data: {
        message: 'Your weekly growth plan has been generated.',
        milestone: 'Weekly Growth Plan Ready',
      },
    });
  });
}
