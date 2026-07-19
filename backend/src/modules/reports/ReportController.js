import ReportService from './ReportService.js';
import QueueService from '../../infrastructure/queue/index.js';
import { QUEUE_NAMES, JOB_NAMES } from '../../queues/queues.js';
import { success, created, badRequest, notFound, serverError } from '../../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../../utils/logger.js';

const ReportController = {
  /**
   * POST /api/v1/reports/generate
   * Enqueues a report generation job and returns the pending report.
   */
  async generate(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { type = 'weekly', platform, referenceDate } = req.body;
      const report = await ReportService.initiateGeneration(String(req.user._id), {
        type, platform, referenceDate,
      });

      // Enqueue the heavy work
      await QueueService.addJob(
        QUEUE_NAMES.REPORT,
        JOB_NAMES[`GENERATE_${type.toUpperCase()}_REPORT`] || JOB_NAMES.GENERATE_WEEKLY_REPORT,
        { userId: String(req.user._id), reportId: String(report._id) },
        { attempts: 2 }
      );

      return created(res, report, 'Report generation started');
    } catch (err) {
      logger.error('ReportController.generate failed', { error: err.message });
      return serverError(res, 'Failed to start report generation');
    }
  },

  /**
   * GET /api/v1/reports
   */
  async list(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { type, status, limit, skip } = req.query;
      const reports = await ReportService.getAll(String(req.user._id), {
        type, status,
        limit: limit ? parseInt(limit, 10) : 20,
        skip:  skip  ? parseInt(skip, 10)  : 0,
      });
      return success(res, reports, 'Reports retrieved', { count: reports.length });
    } catch (err) {
      logger.error('ReportController.list failed', { error: err.message });
      return serverError(res, 'Failed to retrieve reports');
    }
  },

  /**
   * GET /api/v1/reports/latest
   */
  async getLatest(req, res) {
    try {
      const { type } = req.query;
      const report = await ReportService.getLatest(String(req.user._id), type || null);
      if (!report) return notFound(res, 'No report found');
      return success(res, report, 'Latest report retrieved');
    } catch (err) {
      logger.error('ReportController.getLatest failed', { error: err.message });
      return serverError(res, 'Failed to retrieve latest report');
    }
  },

  /**
   * GET /api/v1/reports/:id
   */
  async getById(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const report = await ReportService.getById(String(req.user._id), req.params.id);
      return success(res, report, 'Report retrieved');
    } catch (err) {
      if (err.isOperational) return notFound(res, err.message);
      logger.error('ReportController.getById failed', { error: err.message });
      return serverError(res, 'Failed to retrieve report');
    }
  },

  /**
   * DELETE /api/v1/reports/:id
   */
  async deleteReport(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      await ReportService.deleteReport(String(req.user._id), req.params.id);
      return success(res, null, 'Report deleted');
    } catch (err) {
      if (err.isOperational) return notFound(res, err.message);
      logger.error('ReportController.delete failed', { error: err.message });
      return serverError(res, 'Failed to delete report');
    }
  },
};

export default ReportController;
