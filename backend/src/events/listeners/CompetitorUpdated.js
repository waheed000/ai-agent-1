/**
 * CompetitorUpdated listener
 * Busts competitor cache when a sync completes.
 */

import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import CacheService from '../../services/CacheService.js';
import logger from '../../utils/logger.js';

export function registerCompetitorUpdatedListener() {
  eventBus.on(EVENT_TYPES.COMPETITOR_UPDATED, async ({ userId, competitorId }) => {
    logger.info('Listener[CompetitorUpdated]: busting competitor cache', {
      userId,
      competitorId,
    });
    await CacheService.delPattern('competitors', `${userId}:`);
    await CacheService.delPattern('ai', `${userId}:competitor:`);
  });
}
