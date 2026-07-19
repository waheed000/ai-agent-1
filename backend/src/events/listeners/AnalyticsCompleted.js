/**
 * AnalyticsCompleted listener
 * Could trigger AI report generation after analytics update.
 * Currently logs the event and invalidates caches.
 */

import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import CacheService from '../../infrastructure/cache/index.js';
import logger from '../../utils/logger.js';

export function registerAnalyticsCompletedListener() {
  eventBus.on(EVENT_TYPES.ANALYTICS_COMPLETED, async ({ userId, platform }) => {
    logger.info('Listener[AnalyticsCompleted]: invalidating analytics cache', {
      userId,
      platform,
    });

    await CacheService.delPattern('analytics', `${userId}:`);
    await CacheService.delPattern('ai', `${userId}:`);
  });
}
