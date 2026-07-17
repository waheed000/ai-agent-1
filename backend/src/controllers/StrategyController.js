import StrategyService from '../services/StrategyService.js';
import QueueService from '../services/QueueService.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queues/queues.js';
import { success, created, badRequest, notFound, serverError } from '../utils/response.js';
import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

const StrategyController = {
  /**
   * POST /api/v1/strategy/generate
   */
  async generate(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { planType = '7day', platform } = req.body;
      const strategy = await StrategyService.initiateGeneration(String(req.user._id), { planType, platform });

      await QueueService.addJob(
        QUEUE_NAMES.REPORT,
        JOB_NAMES.GENERATE_STRATEGY,
        { userId: String(req.user._id), strategyId: String(strategy._id) },
        { attempts: 2 }
      );

      return created(res, strategy, 'Strategy generation started');
    } catch (err) {
      logger.error('StrategyController.generate failed', { error: err.message });
      return serverError(res, 'Failed to start strategy generation');
    }
  },

  /**
   * GET /api/v1/strategy
   */
  async list(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return badRequest(res, 'Validation failed', errors.array());

    try {
      const { planType, status, limit } = req.query;
      const strategies = await StrategyService.getAll(String(req.user._id), {
        planType, status,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      return success(res, strategies, 'Strategies retrieved', { count: strategies.length });
    } catch (err) {
      logger.error('StrategyController.list failed', { error: err.message });
      return serverError(res, 'Failed to retrieve strategies');
    }
  },

  /**
   * GET /api/v1/strategy/latest
   */
  async getLatest(req, res) {
    try {
      const { planType } = req.query;
      const strategy = await StrategyService.getLatest(String(req.user._id), planType || null);
      if (!strategy) return notFound(res, 'No strategy found');
      return success(res, strategy, 'Latest strategy retrieved');
    } catch (err) {
      logger.error('StrategyController.getLatest failed', { error: err.message });
      return serverError(res, 'Failed to retrieve latest strategy');
    }
  },
};

export default StrategyController;
