/**
 * ApiKeyController
 * Handles API key lifecycle endpoints.
 */
import ApiKeyService from '../services/ApiKeyService.js';
import { success, created, badRequest, notFound, conflict, serverError } from '../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

const ApiKeyController = {
  /** POST /api/v1/apikeys */
  async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { description, scopes, expiresAt, workspaceId } = req.body;
      const { apiKey, rawKey } = await ApiKeyService.create(String(req.user._id), {
        description, scopes, expiresAt, workspaceId,
      });
      // rawKey shown exactly once; call toJSON so the id/transform is applied
      return created(res, { ...apiKey.toJSON(), rawKey }, 'API key created — save the key now, it will not be shown again');
    } catch (err) {
      logger.error('ApiKeyController.create failed', { error: err.message });
      return serverError(res, 'Failed to create API key');
    }
  },

  /** GET /api/v1/apikeys */
  async list(req, res) {
    try {
      const apiKeys = await ApiKeyService.getAll(String(req.user._id));
      return success(res, apiKeys, 'API keys retrieved', { count: apiKeys.length });
    } catch (err) {
      logger.error('ApiKeyController.list failed', { error: err.message });
      return serverError(res, 'Failed to retrieve API keys');
    }
  },

  /** PATCH /api/v1/apikeys/:id */
  async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const apiKey = await ApiKeyService.update(String(req.user._id), req.params.id, req.body);
      return success(res, apiKey, 'API key updated');
    } catch (err) {
      if (err.isOperational && err.statusCode === 404) return notFound(res, err.message);
      logger.error('ApiKeyController.update failed', { error: err.message });
      return serverError(res, 'Failed to update API key');
    }
  },

  /** POST /api/v1/apikeys/:id/revoke */
  async revoke(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const apiKey = await ApiKeyService.revoke(String(req.user._id), req.params.id);
      return success(res, apiKey, 'API key revoked');
    } catch (err) {
      if (err.isOperational && err.statusCode === 404) return notFound(res, err.message);
      if (err.isOperational && err.statusCode === 409) return conflict(res, err.message);
      logger.error('ApiKeyController.revoke failed', { error: err.message });
      return serverError(res, 'Failed to revoke API key');
    }
  },

  /** DELETE /api/v1/apikeys/:id */
  async delete(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      await ApiKeyService.delete(String(req.user._id), req.params.id);
      return success(res, null, 'API key deleted');
    } catch (err) {
      if (err.isOperational && err.statusCode === 404) return notFound(res, err.message);
      logger.error('ApiKeyController.delete failed', { error: err.message });
      return serverError(res, 'Failed to delete API key');
    }
  },
};

export default ApiKeyController;
