import { Router } from 'express';
import PlannerController from './PlannerController.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  validateGeneratePlanner,
  validatePlannerItem,
  validateUpdatePlannerItem,
  validateCalendar,
  validateCreateDraft,
  validateUpdateDraft,
  validateDraftId,
} from './plannerValidators.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();
router.use(authenticate);

// ── Content Planner ───────────────────────────────────────────────────────────
router.post('/generate',  validateGeneratePlanner,  asyncHandler(PlannerController.generate));
router.get('/',                                     asyncHandler(PlannerController.list));
router.patch('/:id',      validateUpdatePlannerItem, asyncHandler(PlannerController.update));
router.delete('/:id',     validatePlannerItem,       asyncHandler(PlannerController.delete));

export default router;
