import { Router } from 'express';
import PlannerController from '../controllers/PlannerController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateCalendar } from '../validators/plannerValidators.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate);

router.get('/', validateCalendar, asyncHandler(PlannerController.getCalendar));

export default router;
