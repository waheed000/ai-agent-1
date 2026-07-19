/**
 * TrendUpdated listener
 * Busts trend cache when trends are refreshed.
 */

import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import CacheService from '../../infrastructure/cache/index.js';
import logger from '../../utils/logger.js';

export function registerTrendUpdatedListener() {
  eventBus.on(EVENT_TYPES.TREND_UPDATED, async ({ platform }) => {
    logger.info('Listener[TrendUpdated]: busting trend cache', { platform });
    await CacheService.delPattern('trends', '');
    await CacheService.delPattern('ai', 'trend:');
  });
}
