import { param, query, body } from 'express-validator';

export const validateNotificationId = [
  param('id').isMongoId().withMessage('id must be a valid ObjectId'),
];

export const validateListNotifications = [
  query('isRead').optional().isBoolean().withMessage('isRead must be true or false'),
  query('type').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('skip must be >= 0'),
];

export const validateUpdatePreferences = [
  body('enabled').optional().isBoolean().withMessage('enabled must be boolean'),
  body('quietHoursEnabled').optional().isBoolean(),
  body('quietHoursStart').optional().isInt({ min: 0, max: 23 }),
  body('quietHoursEnd').optional().isInt({ min: 0, max: 23 }),
  body('emailDigestEnabled').optional().isBoolean(),
  body('emailDigestFrequency').optional().isIn(['daily', 'weekly']),
  body('types').optional().isObject().withMessage('types must be an object'),
];
