/**
 * UsageRecorded listener
 * Triggered when a usage event is recorded.
 */
import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import logger from '../../utils/logger.js';

export function registerUsageRecordedListener() {
  eventBus.on(EVENT_TYPES.USAGE_RECORDED, ({ userId, category, action, count }) => {
    logger.debug('Listener[UsageRecorded]', { userId, category, action, count });
  });
}
