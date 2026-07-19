/**
 * StrategyGenerated listener
 * Sends a notification when a growth strategy is ready.
 */
import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import QueueService from '../../infrastructure/queue/index.js';
import { QUEUE_NAMES } from '../../queues/queues.js';
import logger from '../../utils/logger.js';

export function registerStrategyGeneratedListener() {
  eventBus.on(EVENT_TYPES.STRATEGY_GENERATED, async ({ userId, strategyId, planType }) => {
    logger.info('Listener[StrategyGenerated]: queueing notification', { userId, planType });

    await QueueService.addJob(QUEUE_NAMES.NOTIFICATION, 'notification:process', {
      userId,
      type: 'ai_recommendation',
      body: `Your ${planType} growth strategy is ready.`,
      refId: strategyId,
    });
  });
}
