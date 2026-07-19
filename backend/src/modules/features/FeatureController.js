/**
 * FeatureController
 * Exposes feature flag read and toggle endpoints.
 */
import FeatureService from './FeatureService.js';
import { success, badRequest, notFound, serverError } from '../../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../../utils/logger.js';

const FeatureController = {
  /** GET /api/v1/features */
  async list(req, res) {
    try {
      const flags = await FeatureService.getAll();
      return success(res, flags, 'Feature flags retrieved');
    } catch (err) {
      logger.error('FeatureController.list failed', { error: err.message });
      return serverError(res, 'Failed to retrieve feature flags');
    }
  },

  /** GET /api/v1/features/:key */
  async getByKey(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const flag = await FeatureService.getByKey(req.params.key);
      return success(res, flag, 'Feature flag retrieved');
    } catch (err) {
      if (err.isOperational && err.statusCode === 404) return notFound(res, err.message);
      logger.error('FeatureController.getByKey failed', { error: err.message });
      return serverError(res, 'Failed to retrieve feature flag');
    }
  },

  /** PATCH /api/v1/features/:key */
  async toggle(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const flag = await FeatureService.setEnabled(req.params.key, req.body.enabled);
      return success(res, flag, `Feature flag ${req.body.enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      if (err.isOperational && err.statusCode === 404) return notFound(res, err.message);
      logger.error('FeatureController.toggle failed', { error: err.message });
      return serverError(res, 'Failed to toggle feature flag');
    }
  },
};

export default FeatureController;
