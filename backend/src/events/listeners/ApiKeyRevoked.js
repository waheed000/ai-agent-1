/**
 * ApiKeyRevoked listener
 * Triggered when an API key is revoked.
 */
import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import logger from '../../utils/logger.js';

export function registerApiKeyRevokedListener() {
  eventBus.on(EVENT_TYPES.API_KEY_REVOKED, ({ userId, apiKeyId }) => {
    logger.info('Listener[ApiKeyRevoked]', { userId, apiKeyId });
  });
}
