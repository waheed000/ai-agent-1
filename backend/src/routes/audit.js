/**
 * Audit log routes — /api/v1/audit
 */
import { Router } from 'express';
import AuditController from '../controllers/AuditController.js';
import { authenticate } from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { validateAuditQuery } from '../validators/auditValidators.js';

const router = Router();
router.use(authenticate);

router.get('/', validateAuditQuery, asyncHandler(AuditController.getLogs));

export default router;
