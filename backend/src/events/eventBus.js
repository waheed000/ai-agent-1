/**
 * EventBus — thin wrapper around Node.js EventEmitter.
 *
 * Design goals:
 * - Services emit events without knowing who listens (loose coupling).
 * - Listeners register themselves once at startup via initListeners().
 * - Errors in listeners are caught and logged so they never crash the emitter.
 *
 * Usage:
 *   eventBus.emit(EVENT_TYPES.PLATFORM_SYNCED, { userId, platform });
 *   eventBus.on(EVENT_TYPES.PLATFORM_SYNCED, handler);
 */

import { EventEmitter } from 'node:events';
import logger from '../utils/logger.js';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Register a permanent listener wrapped in an error boundary.
   */
  on(event, listener) {
    return super.on(event, this._safe(event, listener));
  }

  /**
   * Register a one-time listener wrapped in an error boundary.
   */
  once(event, listener) {
    return super.once(event, this._safe(event, listener));
  }

  /**
   * Emit an event and log it in debug mode.
   */
  emit(event, payload) {
    logger.debug('EventBus: emit', { event });
    return super.emit(event, payload);
  }

  /**
   * Wrap a listener so errors are caught and logged rather than crashing.
   * @private
   */
  _safe(event, listener) {
    return async (...args) => {
      try {
        await listener(...args);
      } catch (err) {
        logger.error('EventBus: listener error', {
          event,
          error: err.message,
        });
      }
    };
  }
}

export default new EventBus();
