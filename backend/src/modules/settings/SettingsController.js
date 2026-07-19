/**
 * SettingsController
 * Handles settings read and update endpoints.
 */
import SettingsService from './SettingsService.js';
import { success, badRequest, serverError } from '../../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../../utils/logger.js';

const SettingsController = {
  /** GET /api/v1/settings */
  async getAll(req, res) {
    try {
      const settings = await SettingsService.getAll(String(req.user._id));
      return success(res, settings, 'Settings retrieved');
    } catch (err) {
      logger.error('SettingsController.getAll failed', { error: err.message });
      return serverError(res, 'Failed to retrieve settings');
    }
  },

  /** GET /api/v1/settings/:type */
  async getByType(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const settings = await SettingsService.getByType(String(req.user._id), req.params.type);
      return success(res, settings, 'Settings retrieved');
    } catch (err) {
      logger.error('SettingsController.getByType failed', { error: err.message });
      return serverError(res, 'Failed to retrieve settings');
    }
  },

  /** PATCH /api/v1/settings/:type */
  async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const settings = await SettingsService.update(
        String(req.user._id),
        req.params.type,
        req.body,
        { ip, userAgent }
      );
      return success(res, settings, 'Settings updated');
    } catch (err) {
      logger.error('SettingsController.update failed', { error: err.message });
      return serverError(res, 'Failed to update settings');
    }
  },
};

export default SettingsController;
