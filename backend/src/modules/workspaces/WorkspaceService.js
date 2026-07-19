/**
 * WorkspaceService
 * Business logic for workspace lifecycle and membership.
 */
import WorkspaceRepository from './WorkspaceRepository.js';
import AuditService from '../audit/AuditService.js';
import UsageService from '../usage/UsageService.js';
import CacheService from '../../infrastructure/cache/index.js';
import eventBus from '../../events/eventBus.js';
import { EVENT_TYPES } from '../../events/eventTypes.js';
import { ConflictError, NotFoundError, AuthorizationError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

const CACHE_NS = 'workspaces';
const CACHE_TTL = 60 * 5; // 5 min

function buildSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

const WorkspaceService = {
  async create(ownerId, data) {
    const slug = data.slug || buildSlug(data.name) + '-' + Math.random().toString(36).slice(2, 7);

    const existing = await WorkspaceRepository.findBySlug(slug);
    if (existing) throw new ConflictError(`Workspace slug "${slug}" is already taken`);

    const workspace = await WorkspaceRepository.create(ownerId, {
      ...data,
      slug,
      members: [{ user: ownerId, role: 'owner', joinedAt: new Date() }],
    });

    await AuditService.log({
      userId: ownerId,
      workspaceId: workspace._id,
      action: 'workspace.created',
      resource: 'Workspace',
      resourceId: workspace._id,
    });

    eventBus.emit(EVENT_TYPES.WORKSPACE_CREATED, {
      userId: String(ownerId),
      workspaceId: String(workspace._id),
    });

    logger.info('WorkspaceService: created', { workspaceId: String(workspace._id) });
    return workspace;
  },

  async getAll(userId) {
    return CacheService.getOrSet(
      CACHE_NS,
      `user:${userId}`,
      () => WorkspaceRepository.findAllAccessible(userId),
      CACHE_TTL
    );
  },

  async getById(workspaceId) {
    return CacheService.getOrSet(
      CACHE_NS,
      `id:${workspaceId}`,
      () => WorkspaceRepository.findById(workspaceId),
      CACHE_TTL
    );
  },

  async update(userId, workspaceId, data) {
    const workspace = await WorkspaceRepository.findById(workspaceId);
    if (String(workspace.owner) !== String(userId)) {
      throw new AuthorizationError('Only the workspace owner can update it');
    }

    const updated = await WorkspaceRepository.update(workspaceId, data);
    await CacheService.del(CACHE_NS, `id:${workspaceId}`);
    await CacheService.del(CACHE_NS, `user:${userId}`);

    await AuditService.log({
      userId,
      workspaceId,
      action: 'workspace.updated',
      resource: 'Workspace',
      resourceId: workspaceId,
      metadata: { fields: Object.keys(data) },
    });

    eventBus.emit(EVENT_TYPES.WORKSPACE_UPDATED, { userId: String(userId), workspaceId: String(workspaceId) });
    return updated;
  },

  async delete(userId, workspaceId) {
    const workspace = await WorkspaceRepository.findById(workspaceId);
    if (String(workspace.owner) !== String(userId)) {
      throw new AuthorizationError('Only the workspace owner can delete it');
    }

    const deleted = await WorkspaceRepository.softDelete(workspaceId);
    await CacheService.del(CACHE_NS, `id:${workspaceId}`);
    await CacheService.del(CACHE_NS, `user:${userId}`);

    await AuditService.log({
      userId,
      workspaceId,
      action: 'workspace.deleted',
      resource: 'Workspace',
      resourceId: workspaceId,
    });

    eventBus.emit(EVENT_TYPES.WORKSPACE_DELETED, {
      userId: String(userId),
      workspaceId: String(workspaceId),
    });

    logger.info('WorkspaceService: deleted', { workspaceId: String(workspaceId) });
    return deleted;
  },
};

export default WorkspaceService;
