/**
 * TeamService
 * Business logic for workspace membership (invite, update role, remove).
 */
import WorkspaceRepository from '../repositories/WorkspaceRepository.js';
import AuditService from './AuditService.js';
import CacheService from './CacheService.js';
import eventBus from '../events/eventBus.js';
import { EVENT_TYPES } from '../events/eventTypes.js';
import { ConflictError, NotFoundError, AuthorizationError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const WORKSPACE_ROLES = ['owner', 'admin', 'editor', 'viewer'];
const CACHE_NS = 'workspaces';

function assertManager(workspace, userId) {
  const member = workspace.members?.find(m => String(m.user) === String(userId));
  const isOwner = String(workspace.owner) === String(userId);
  if (!isOwner && member?.role !== 'admin') {
    throw new AuthorizationError('Only owners and admins can manage team members');
  }
}

const TeamService = {
  async invite(workspaceId, requesterId, { userId, role = 'viewer' }) {
    if (!WORKSPACE_ROLES.includes(role) || role === 'owner') {
      throw new ConflictError('Invalid role — allowed: admin, editor, viewer');
    }

    const workspace = await WorkspaceRepository.findById(workspaceId);
    assertManager(workspace, requesterId);

    const alreadyMember = workspace.members?.some(m => String(m.user) === String(userId));
    if (alreadyMember || String(workspace.owner) === String(userId)) {
      throw new ConflictError('User is already a member of this workspace');
    }

    const updated = await WorkspaceRepository.addMember(workspaceId, {
      user: userId,
      role,
      joinedAt: new Date(),
    });

    await CacheService.del(CACHE_NS, `id:${workspaceId}`);

    await AuditService.log({
      userId: requesterId,
      workspaceId,
      action: 'member.invited',
      resource: 'Workspace',
      resourceId: workspaceId,
      metadata: { invitedUser: String(userId), role },
    });

    eventBus.emit(EVENT_TYPES.MEMBER_INVITED, {
      workspaceId: String(workspaceId),
      userId: String(requesterId),
      invitedUserId: String(userId),
      role,
    });

    logger.info('TeamService: member invited', { workspaceId: String(workspaceId), userId: String(userId) });
    return updated;
  },

  async getMembers(workspaceId) {
    const workspace = await WorkspaceRepository.findById(workspaceId);
    return workspace.members ?? [];
  },

  async updateMember(workspaceId, requesterId, userId, role) {
    if (!WORKSPACE_ROLES.includes(role) || role === 'owner') {
      throw new ValidationError('Invalid role — allowed: admin, editor, viewer');
    }

    const workspace = await WorkspaceRepository.findById(workspaceId);
    assertManager(workspace, requesterId);

    if (String(workspace.owner) === String(userId)) {
      throw new AuthorizationError('Cannot change the role of the workspace owner');
    }

    const member = workspace.members?.find(m => String(m.user) === String(userId));
    if (!member) throw new NotFoundError('Workspace member');

    const updated = await WorkspaceRepository.updateMember(workspaceId, userId, role);
    await CacheService.del(CACHE_NS, `id:${workspaceId}`);

    await AuditService.log({
      userId: requesterId,
      workspaceId,
      action: 'member.updated',
      resource: 'Workspace',
      resourceId: workspaceId,
      metadata: { targetUser: String(userId), newRole: role },
    });

    return updated;
  },

  async removeMember(workspaceId, requesterId, userId) {
    const workspace = await WorkspaceRepository.findById(workspaceId);
    assertManager(workspace, requesterId);

    if (String(workspace.owner) === String(userId)) {
      throw new AuthorizationError('Cannot remove the workspace owner');
    }

    const member = workspace.members?.find(m => String(m.user) === String(userId));
    if (!member) throw new NotFoundError('Workspace member');

    const updated = await WorkspaceRepository.removeMember(workspaceId, userId);
    await CacheService.del(CACHE_NS, `id:${workspaceId}`);

    await AuditService.log({
      userId: requesterId,
      workspaceId,
      action: 'member.removed',
      resource: 'Workspace',
      resourceId: workspaceId,
      metadata: { removedUser: String(userId) },
    });

    logger.info('TeamService: member removed', { workspaceId: String(workspaceId), userId: String(userId) });
    return updated;
  },
};

export default TeamService;
