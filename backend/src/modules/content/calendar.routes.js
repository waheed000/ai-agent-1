import { Router } from 'express';
import PlannerController from './PlannerController.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { validateCalendar } from './plannerValidators.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();
router.use(authenticate);

router.get('/', validateCalendar, asyncHandler(PlannerController.getCalendar));

export default router;
