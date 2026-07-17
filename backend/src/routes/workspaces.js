/**
 * Workspace routes — /api/v1/workspaces
 */
import { Router } from 'express';
import WorkspaceController from '../controllers/WorkspaceController.js';
import { authenticate } from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  validateCreateWorkspace,
  validateWorkspaceId,
  validateUpdateWorkspace,
  validateInviteMember,
  validateUpdateMember,
  validateRemoveMember,
} from '../validators/workspaceValidators.js';

const router = Router();
router.use(authenticate);

// Workspace CRUD
router.post('/',      validateCreateWorkspace, asyncHandler(WorkspaceController.create));
router.get('/',                                asyncHandler(WorkspaceController.list));
router.get('/:id',   validateWorkspaceId,      asyncHandler(WorkspaceController.getById));
router.patch('/:id', validateUpdateWorkspace,  asyncHandler(WorkspaceController.update));
router.delete('/:id',validateWorkspaceId,      asyncHandler(WorkspaceController.delete));

// Team management
router.post('/:id/invite',             validateInviteMember,  asyncHandler(WorkspaceController.invite));
router.get('/:id/members',             validateWorkspaceId,   asyncHandler(WorkspaceController.getMembers));
router.patch('/:id/members/:user',     validateUpdateMember,  asyncHandler(WorkspaceController.updateMember));
router.delete('/:id/members/:user',    validateRemoveMember,  asyncHandler(WorkspaceController.removeMember));

export default router;
