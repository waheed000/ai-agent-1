/**
 * WorkspaceController
 * Handles workspace CRUD and team management endpoints.
 */
import WorkspaceService from '../services/WorkspaceService.js';
import TeamService from '../services/TeamService.js';
import { success, created, badRequest, notFound, forbidden, serverError } from '../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

const WorkspaceController = {
  // ─── Workspace CRUD ────────────────────────────────────────────────────────

  /** POST /api/v1/workspaces */
  async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const workspace = await WorkspaceService.create(String(req.user._id), req.body);
      return created(res, workspace, 'Workspace created');
    } catch (err) {
      if (err.isOperational && err.statusCode === 409) return badRequest(res, err.message);
      logger.error('WorkspaceController.create failed', { error: err.message });
      return serverError(res, 'Failed to create workspace');
    }
  },

  /** GET /api/v1/workspaces */
  async list(req, res) {
    try {
      const workspaces = await WorkspaceService.getAll(String(req.user._id));
      return success(res, workspaces, 'Workspaces retrieved', { count: workspaces.length });
    } catch (err) {
      logger.error('WorkspaceController.list failed', { error: err.message });
      return serverError(res, 'Failed to retrieve workspaces');
    }
  },

  /** GET /api/v1/workspaces/:id */
  async getById(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const workspace = await WorkspaceService.getById(req.params.id);
      return success(res, workspace, 'Workspace retrieved');
    } catch (err) {
      if (err.isOperational && err.statusCode === 404) return notFound(res, err.message);
      logger.error('WorkspaceController.getById failed', { error: err.message });
      return serverError(res, 'Failed to retrieve workspace');
    }
  },

  /** PATCH /api/v1/workspaces/:id */
  async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const workspace = await WorkspaceService.update(String(req.user._id), req.params.id, req.body);
      return success(res, workspace, 'Workspace updated');
    } catch (err) {
      if (err.isOperational && err.statusCode === 403) return forbidden(res, err.message);
      if (err.isOperational && err.statusCode === 404) return notFound(res, err.message);
      logger.error('WorkspaceController.update failed', { error: err.message });
      return serverError(res, 'Failed to update workspace');
    }
  },

  /** DELETE /api/v1/workspaces/:id */
  async delete(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      await WorkspaceService.delete(String(req.user._id), req.params.id);
      return success(res, null, 'Workspace deleted');
    } catch (err) {
      if (err.isOperational && err.statusCode === 403) return forbidden(res, err.message);
      if (err.isOperational && err.statusCode === 404) return notFound(res, err.message);
      logger.error('WorkspaceController.delete failed', { error: err.message });
      return serverError(res, 'Failed to delete workspace');
    }
  },

  // ─── Team management ───────────────────────────────────────────────────────

  /** POST /api/v1/workspaces/:id/invite */
  async invite(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { userId, role } = req.body;
      const workspace = await TeamService.invite(req.params.id, String(req.user._id), { userId, role });
      return success(res, workspace, 'Member invited');
    } catch (err) {
      if (err.isOperational && err.statusCode === 409) return badRequest(res, err.message);
      if (err.isOperational && err.statusCode === 403) return forbidden(res, err.message);
      if (err.isOperational && err.statusCode === 404) return notFound(res, err.message);
      logger.error('WorkspaceController.invite failed', { error: err.message });
      return serverError(res, 'Failed to invite member');
    }
  },

  /** GET /api/v1/workspaces/:id/members */
  async getMembers(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const members = await TeamService.getMembers(req.params.id);
      return success(res, members, 'Members retrieved', { count: members.length });
    } catch (err) {
      if (err.isOperational && err.statusCode === 404) return notFound(res, err.message);
      logger.error('WorkspaceController.getMembers failed', { error: err.message });
      return serverError(res, 'Failed to retrieve members');
    }
  },

  /** PATCH /api/v1/workspaces/:id/members/:user */
  async updateMember(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { role } = req.body;
      const workspace = await TeamService.updateMember(
        req.params.id,
        String(req.user._id),
        req.params.user,
        role
      );
      return success(res, workspace, 'Member role updated');
    } catch (err) {
      if (err.isOperational && err.statusCode === 403) return forbidden(res, err.message);
      if (err.isOperational && err.statusCode === 404) return notFound(res, err.message);
      logger.error('WorkspaceController.updateMember failed', { error: err.message });
      return serverError(res, 'Failed to update member');
    }
  },

  /** DELETE /api/v1/workspaces/:id/members/:user */
  async removeMember(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      await TeamService.removeMember(req.params.id, String(req.user._id), req.params.user);
      return success(res, null, 'Member removed');
    } catch (err) {
      if (err.isOperational && err.statusCode === 403) return forbidden(res, err.message);
      if (err.isOperational && err.statusCode === 404) return notFound(res, err.message);
      logger.error('WorkspaceController.removeMember failed', { error: err.message });
      return serverError(res, 'Failed to remove member');
    }
  },
};

export default WorkspaceController;
