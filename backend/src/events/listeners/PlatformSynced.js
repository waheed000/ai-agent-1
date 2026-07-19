/**
 * PlatformSynced listener
 * Triggers analytics recalculation when a platform sync completes.
 */

import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import QueueService from '../../infrastructure/queue/index.js';
import { QUEUE_NAMES, JOB_NAMES } from '../../queues/queues.js';
import logger from '../../utils/logger.js';

export function registerPlatformSyncedListener() {
  eventBus.on(EVENT_TYPES.PLATFORM_SYNCED, async ({ userId, platform }) => {
    logger.info('Listener[PlatformSynced]: scheduling analytics recalculation', {
      userId,
      platform,
    });

    await QueueService.addJob(
      QUEUE_NAMES.ANALYTICS,
      JOB_NAMES.RECALCULATE_USER_ANALYTICS,
      { type: 'user', userId, platform },
      { attempts: 2, priority: 5 }
    );
  });
}
