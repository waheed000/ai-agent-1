/**
 * WorkspaceUpdated listener
 * Triggered when a workspace name, description, or settings are changed.
 */
import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import logger from '../../utils/logger.js';

export function registerWorkspaceUpdatedListener() {
  eventBus.on(EVENT_TYPES.WORKSPACE_UPDATED, ({ userId, workspaceId }) => {
    logger.info('Listener[WorkspaceUpdated]', { userId, workspaceId });
  });
}
