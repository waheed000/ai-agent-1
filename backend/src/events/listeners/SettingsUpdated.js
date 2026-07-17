/**
 * SettingsUpdated listener
 * Triggered when workspace or user settings are changed.
 */
import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import logger from '../../utils/logger.js';

export function registerSettingsUpdatedListener() {
  eventBus.on(EVENT_TYPES.SETTINGS_UPDATED, ({ userId, type }) => {
    logger.info('Listener[SettingsUpdated]', { userId, type });
  });
}
