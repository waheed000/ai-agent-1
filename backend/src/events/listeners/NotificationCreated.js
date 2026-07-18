/**
 * NotificationCreated listener
 * Handles post-dispatch side-effects (analytics, WebSocket push, etc.)
 * Dispatch itself is performed synchronously in NotificationService before this event fires.
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
  });
}
