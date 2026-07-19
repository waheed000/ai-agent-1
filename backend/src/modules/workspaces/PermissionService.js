/**
 * PermissionService
 * Workspace ownership and role-based permission checks.
 * Used as middleware helpers and by other services.
 */
import WorkspaceRepository from './WorkspaceRepository.js';
import { AuthorizationError, NotFoundError } from '../../utils/errors.js';

const ROLE_HIERARCHY = { owner: 4, admin: 3, editor: 2, viewer: 1 };

const PermissionService = {
  /**
   * Get a user's role in a workspace.
   * Returns null if the user has no access.
   */
  async getRole(workspaceId, userId) {
    const workspace = await WorkspaceRepository.findById(workspaceId);
    if (String(workspace.owner) === String(userId)) return 'owner';
    const member = workspace.members?.find(m => String(m.user) === String(userId));
    return member?.role ?? null;
  },

  /**
   * Assert the user is a member with at least the required role.
   * Throws AuthorizationError if access is denied.
   */
  async assertRole(workspaceId, userId, requiredRole) {
    const role = await PermissionService.getRole(workspaceId, userId);
    if (!role) throw new AuthorizationError('You are not a member of this workspace');
    if ((ROLE_HIERARCHY[role] ?? 0) < (ROLE_HIERARCHY[requiredRole] ?? 0)) {
      throw new AuthorizationError(`This action requires the "${requiredRole}" role or higher`);
    }
    return role;
  },

  /**
   * Assert the user is the workspace owner.
   */
  async assertOwner(workspaceId, userId) {
    const workspace = await WorkspaceRepository.findById(workspaceId);
    if (String(workspace.owner) !== String(userId)) {
      throw new AuthorizationError('Only the workspace owner can perform this action');
    }
  },

  /**
   * Check (no-throw) whether a user has at least the given role.
   */
  async hasRole(workspaceId, userId, requiredRole) {
    try {
      await PermissionService.assertRole(workspaceId, userId, requiredRole);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Express middleware factory — requires the user to have at least `role`
   * in the workspace identified by req.params.id.
   *
   * Usage: router.delete('/:id', authenticate, PermissionService.requireRole('admin'), handler)
   */
  requireRole(requiredRole) {
    return async (req, _res, next) => {
      try {
        await PermissionService.assertRole(req.params.id, req.user._id, requiredRole);
        next();
      } catch (err) {
        next(err);
      }
    };
  },
};

export default PermissionService;
