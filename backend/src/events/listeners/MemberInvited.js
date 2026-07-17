/**
 * MemberInvited listener
 * Triggered when a user is invited to a workspace.
 */
import eventBus from '../eventBus.js';
import { EVENT_TYPES } from '../eventTypes.js';
import QueueService from '../../services/QueueService.js';
import { QUEUE_NAMES } from '../../queues/queues.js';
import logger from '../../utils/logger.js';

export function registerMemberInvitedListener() {
  eventBus.on(EVENT_TYPES.MEMBER_INVITED, async ({ workspaceId, userId, invitedUserId, role }) => {
    logger.info('Listener[MemberInvited]: queueing notification', { workspaceId, invitedUserId });

    await QueueService.addJob(QUEUE_NAMES.NOTIFICATION, 'notification:process', {
      userId: invitedUserId,
      type: 'workspace_invite',
      refModel: 'Workspace',
      refId: workspaceId,
      metadata: { role, invitedBy: userId },
    });
  });
}
