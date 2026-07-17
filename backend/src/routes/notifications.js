import { Router } from 'express';
import NotificationController from '../controllers/NotificationController.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  validateNotificationId,
  validateListNotifications,
  validateUpdatePreferences,
} from '../validators/notificationValidators.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate);

// Order matters: /read-all and /preferences before /:id
router.get('/',                validateListNotifications, asyncHandler(NotificationController.list));
router.patch('/read-all',                                 asyncHandler(NotificationController.markAllRead));
router.patch('/preferences',   validateUpdatePreferences, asyncHandler(NotificationController.updatePreferences));
router.patch('/:id/read',      validateNotificationId,    asyncHandler(NotificationController.markRead));
router.delete('/:id',          validateNotificationId,    asyncHandler(NotificationController.deleteNotification));

export default router;
