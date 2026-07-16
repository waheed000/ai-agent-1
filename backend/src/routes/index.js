/**
 * API v1 router — central registration point.
 * Add new feature routers here as they are built in future phases.
 */

import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import accountRouter from './account.js';
import integrationsRouter from './integrations.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/account', accountRouter);
router.use('/integrations', integrationsRouter);

// Future routes will be mounted here:
// router.use('/analytics',   analyticsRouter);
// router.use('/insights',    insightsRouter);
// router.use('/content',     contentRouter);
// router.use('/competitors', competitorRouter);
// router.use('/trends',      trendsRouter);
// router.use('/reports',     reportsRouter);

export default router;
