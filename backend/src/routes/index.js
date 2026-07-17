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
import competitorsRouter from './competitors.js';
import trendsRouter from './trends.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/account', accountRouter);
router.use('/integrations', integrationsRouter);
router.use('/platforms', platformsRouter);
router.use('/jobs', jobsRouter);
router.use('/analytics', analyticsRouter);
router.use('/competitors', competitorsRouter);
router.use('/trends', trendsRouter);

export default router;
