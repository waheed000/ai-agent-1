/**
 * WorkspaceDeleted listener
 * Handles cleanup when a workspace is soft-deleted.
 */
import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import logger from '../../utils/logger.js';

export function registerWorkspaceDeletedListener() {
  eventBus.on(EVENT_TYPES.WORKSPACE_DELETED, ({ userId, workspaceId }) => {
    logger.info('Listener[WorkspaceDeleted]', { userId, workspaceId });
  });
}
