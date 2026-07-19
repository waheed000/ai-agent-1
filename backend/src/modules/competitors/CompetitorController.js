/**
 * CompetitorController
 * HTTP layer over CompetitorService — no business logic here.
 */

import CompetitorService from './CompetitorService.js';
import { success, created, badRequest, notFound, serverError, conflict } from '../../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../../utils/logger.js';

const CompetitorController = {
  /**
   * POST /api/v1/competitors
   */
  async addCompetitor(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const competitor = await CompetitorService.addCompetitor(
        String(req.user._id),
        req.body
      );
      return created(res, competitor, 'Competitor added');
    } catch (err) {
      if (err.code === 'CONFLICT') return conflict(res, err.message);
      if (err.code === 'LIMIT_EXCEEDED') return badRequest(res, err.message);
      logger.error('CompetitorController.addCompetitor failed', { error: err.message });
      return serverError(res, 'Failed to add competitor');
    }
  },

  /**
   * GET /api/v1/competitors
   */
  async listCompetitors(req, res) {
    try {
      const { platform, status } = req.query;
      const competitors = await CompetitorService.listCompetitors(
        String(req.user._id),
        { platform, status }
      );
      return success(res, competitors, 'Competitors retrieved', { count: competitors.length });
    } catch (err) {
      logger.error('CompetitorController.listCompetitors failed', { error: err.message });
      return serverError(res, 'Failed to retrieve competitors');
    }
  },

  /**
   * DELETE /api/v1/competitors/:id
   */
  async deleteCompetitor(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      await CompetitorService.deleteCompetitor(String(req.user._id), req.params.id);
      return success(res, null, 'Competitor removed');
    } catch (err) {
      if (err.code === 'NOT_FOUND' || err.isOperational) return notFound(res, err.message);
      logger.error('CompetitorController.deleteCompetitor failed', { error: err.message });
      return serverError(res, 'Failed to remove competitor');
    }
  },

  /**
   * GET /api/v1/competitors/:id/overview
   */
  async getOverview(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const data = await CompetitorService.getOverview(
        String(req.user._id),
        req.params.id
      );
      return success(res, data, 'Competitor overview retrieved');
    } catch (err) {
      if (err.code === 'NOT_FOUND' || err.isOperational) return notFound(res, err.message);
      logger.error('CompetitorController.getOverview failed', { error: err.message });
      return serverError(res, 'Failed to retrieve competitor overview');
    }
  },

  /**
   * POST /api/v1/competitors/:id/sync
   */
  async syncCompetitor(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const result = await CompetitorService.syncCompetitor(
        String(req.user._id),
        req.params.id
      );
      return success(res, result, 'Competitor sync complete');
    } catch (err) {
      if (err.code === 'NOT_FOUND' || err.isOperational) return notFound(res, err.message);
      logger.error('CompetitorController.syncCompetitor failed', { error: err.message });
      return serverError(res, 'Competitor sync failed');
    }
  },
};

export default CompetitorController;
