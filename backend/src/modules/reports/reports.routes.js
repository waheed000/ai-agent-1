import { Router } from 'express';
import ReportController from './ReportController.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  validateGenerateReport,
  validateReportId,
  validateListReports,
} from './reportValidators.js';
import asyncHandler from '../../utils/asyncHandler.js';

const router = Router();
router.use(authenticate);

// Order matters: /latest before /:id
router.post('/generate',  validateGenerateReport, asyncHandler(ReportController.generate));
router.get('/',           validateListReports,    asyncHandler(ReportController.list));
router.get('/latest',                             asyncHandler(ReportController.getLatest));
router.get('/:id',        validateReportId,       asyncHandler(ReportController.getById));
router.delete('/:id',     validateReportId,       asyncHandler(ReportController.deleteReport));

export default router;
