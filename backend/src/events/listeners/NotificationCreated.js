/**
 * NotificationCreated listener
 * Can be used to trigger WebSocket push, logging, analytics, etc.
 * Currently just logs the event.
 */
import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import logger from '../../utils/logger.js';

export function registerNotificationCreatedListener() {
  eventBus.on(EVENT_TYPES.NOTIFICATION_CREATED, async ({ userId, notificationId, type }) => {
    logger.debug('Listener[NotificationCreated]: notification dispatched', {
      userId,
      notificationId,
      type,
    });
    // TODO: push to WebSocket room `user:${userId}` when WS provider is integrated
  });
}
