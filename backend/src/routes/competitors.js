import { Router } from 'express';
import CompetitorController from '../controllers/CompetitorController.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  validateAddCompetitor,
  validateCompetitorId,
} from '../validators/competitorValidators.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// All competitor endpoints require authentication
router.use(authenticate);

router.post('/', validateAddCompetitor, asyncHandler(CompetitorController.addCompetitor));
router.get('/', asyncHandler(CompetitorController.listCompetitors));
router.delete('/:id', validateCompetitorId, asyncHandler(CompetitorController.deleteCompetitor));
router.get('/:id/overview', validateCompetitorId, asyncHandler(CompetitorController.getOverview));
router.post('/:id/sync', validateCompetitorId, asyncHandler(CompetitorController.syncCompetitor));

export default router;
