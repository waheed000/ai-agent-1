import { Router } from 'express';
import PlannerController from '../controllers/PlannerController.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  validateCreateDraft,
  validateUpdateDraft,
  validateDraftId,
} from '../validators/plannerValidators.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate);

router.post('/',      validateCreateDraft, asyncHandler(PlannerController.createDraft));
router.patch('/:id',  validateUpdateDraft, asyncHandler(PlannerController.updateDraft));
router.delete('/:id', validateDraftId,     asyncHandler(PlannerController.deleteDraft));

export default router;
