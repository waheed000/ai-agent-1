import { Router } from 'express';
import StrategyController from '../controllers/StrategyController.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  validateGenerateStrategy,
  validateListStrategy,
} from '../validators/strategyValidators.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate);

router.post('/generate', validateGenerateStrategy, asyncHandler(StrategyController.generate));
router.get('/',          validateListStrategy,      asyncHandler(StrategyController.list));
router.get('/latest',                               asyncHandler(StrategyController.getLatest));

export default router;
