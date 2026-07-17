/**
 * PlannerGenerated listener
 * Sends a notification when content planner generation finishes.
 */
import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import QueueService from '../../services/QueueService.js';
import { QUEUE_NAMES } from '../../queues/queues.js';
import logger from '../../utils/logger.js';

export function registerPlannerGeneratedListener() {
  eventBus.on(EVENT_TYPES.PLANNER_GENERATED, async ({ userId, count, days }) => {
    logger.info('Listener[PlannerGenerated]: content plan ready', { userId, count, days });

    await QueueService.addJob(QUEUE_NAMES.NOTIFICATION, 'notification:process', {
      userId,
      type: 'ai_recommendation',
      body: `Your ${days}-day content plan is ready — ${count} items scheduled.`,
    });
  });
}
