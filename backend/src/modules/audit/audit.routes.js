/**
 * Audit log routes — /api/v1/audit
 */
import { Router } from 'express';
import AuditController from './AuditController.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { validateAuditQuery } from './auditValidators.js';

const router = Router();
router.use(authenticate);

router.get('/', validateAuditQuery, asyncHandler(AuditController.getLogs));

export default router;
