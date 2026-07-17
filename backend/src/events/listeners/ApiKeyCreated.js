/**
 * ApiKeyCreated listener
 * Triggered when a new API key is generated.
 */
import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import logger from '../../utils/logger.js';

export function registerApiKeyCreatedListener() {
  eventBus.on(EVENT_TYPES.API_KEY_CREATED, ({ userId, apiKeyId }) => {
    logger.info('Listener[ApiKeyCreated]', { userId, apiKeyId });
  });
}
