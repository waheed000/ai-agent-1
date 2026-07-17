/**
 * WorkspaceCreated listener
 * Logs audit entry when a workspace is created.
 */
import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import logger from '../../utils/logger.js';

export function registerWorkspaceCreatedListener() {
  eventBus.on(EVENT_TYPES.WORKSPACE_CREATED, ({ userId, workspaceId }) => {
    logger.info('Listener[WorkspaceCreated]', { userId, workspaceId });
  });
}
