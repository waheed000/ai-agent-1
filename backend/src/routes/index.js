/**
 * API v1 router — central registration point.
 */

import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import accountRouter from './account.js';
import integrationsRouter from './integrations.js';
import platformsRouter from './platforms.js';
import jobsRouter from './jobs.js';
import analyticsRouter from './analytics.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/account', accountRouter);
router.use('/integrations', integrationsRouter);
router.use('/platforms', platformsRouter);
router.use('/jobs', jobsRouter);
router.use('/analytics', analyticsRouter);

// Future routes will be mounted here:
// router.use('/insights',    insightsRouter);
// router.use('/content',     contentRouter);
// router.use('/competitors', competitorRouter);
// router.use('/trends',      trendsRouter);
// router.use('/reports',     reportsRouter);

export default router;
