import PlannerService from '../services/PlannerService.js';
import CalendarService from '../services/CalendarService.js';
import QueueService from '../services/QueueService.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queues/queues.js';
import { success, created, badRequest, notFound, serverError } from '../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

const PlannerController = {
  /**
   * POST /api/v1/planner/generate
   * Enqueues async planner generation OR runs synchronously for small calendars.
   */
  async generate(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { days = 7, platforms, campaignName } = req.body;

      // Enqueue if large calendar; run inline for ≤7 days
      if (days > 7 && QueueService.enabled) {
        await QueueService.addJob(
          QUEUE_NAMES.PLANNER,
          JOB_NAMES.GENERATE_PLANNER,
          { userId: String(req.user._id), days, platforms, campaignName },
          { attempts: 2 }
        );
        return created(res, { queued: true, days, platforms }, 'Planner generation queued');
      }

      const result = await PlannerService.generate(String(req.user._id), { days, platforms, campaignName });
      return created(res, result, 'Content plan generated');
    } catch (err) {
      logger.error('PlannerController.generate failed', { error: err.message });
      return serverError(res, 'Failed to generate content plan');
    }
  },

  /**
   * GET /api/v1/planner
   */
  async list(req, res) {
    try {
      const { platform, status, startDate, endDate, limit, skip } = req.query;
      const items = await PlannerService.getAll(String(req.user._id), {
        platform, status, startDate, endDate,
        limit: limit ? parseInt(limit, 10) : 50,
        skip:  skip  ? parseInt(skip, 10)  : 0,
      });
      return success(res, items, 'Content plan retrieved', { count: items.length });
    } catch (err) {
      logger.error('PlannerController.list failed', { error: err.message });
      return serverError(res, 'Failed to retrieve content plan');
    }
  },

  /**
   * PATCH /api/v1/planner/:id
   */
  async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const item = await PlannerService.update(String(req.user._id), req.params.id, req.body);
      return success(res, item, 'Content item updated');
    } catch (err) {
      if (err.isOperational) return notFound(res, err.message);
      logger.error('PlannerController.update failed', { error: err.message });
      return serverError(res, 'Failed to update content item');
    }
  },

  /**
   * DELETE /api/v1/planner/:id
   */
  async delete(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      await PlannerService.delete(String(req.user._id), req.params.id);
      return success(res, null, 'Content item deleted');
    } catch (err) {
      if (err.isOperational) return notFound(res, err.message);
      logger.error('PlannerController.delete failed', { error: err.message });
      return serverError(res, 'Failed to delete content item');
    }
  },

  // ── Calendar ──────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/calendar
   */
  async getCalendar(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { startDate, endDate } = req.query;
      const calendar = await CalendarService.getCalendar(String(req.user._id), { startDate, endDate });
      return success(res, calendar, 'Calendar retrieved');
    } catch (err) {
      logger.error('PlannerController.getCalendar failed', { error: err.message });
      return serverError(res, 'Failed to retrieve calendar');
    }
  },

  // ── Drafts ────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/drafts
   */
  async createDraft(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const draft = await PlannerService.createDraft(String(req.user._id), req.body);
      return created(res, draft, 'Draft created');
    } catch (err) {
      logger.error('PlannerController.createDraft failed', { error: err.message });
      return serverError(res, 'Failed to create draft');
    }
  },

  /**
   * PATCH /api/v1/drafts/:id
   */
  async updateDraft(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const draft = await PlannerService.updateDraft(String(req.user._id), req.params.id, req.body);
      return success(res, draft, 'Draft updated');
    } catch (err) {
      if (err.isOperational) return notFound(res, err.message);
      logger.error('PlannerController.updateDraft failed', { error: err.message });
      return serverError(res, 'Failed to update draft');
    }
  },

  /**
   * DELETE /api/v1/drafts/:id
   */
  async deleteDraft(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      await PlannerService.deleteDraft(String(req.user._id), req.params.id);
      return success(res, null, 'Draft deleted');
    } catch (err) {
      if (err.isOperational) return notFound(res, err.message);
      logger.error('PlannerController.deleteDraft failed', { error: err.message });
      return serverError(res, 'Failed to delete draft');
    }
  },
};

export default PlannerController;
