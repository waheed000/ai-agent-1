/**
 * Search routes — /api/v1/search
 */
import { Router } from 'express';
import SearchController from './SearchController.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { validateSearch } from './searchValidators.js';

const router = Router();
router.use(authenticate);

router.get('/', validateSearch, asyncHandler(SearchController.search));

export default router;
