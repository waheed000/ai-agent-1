import { body, param } from 'express-validator';
import { PLATFORMS } from '../../models/utils/schemaUtils.js';

export const validateJobTrigger = [
  param('platform')
    .trim()
    .toLowerCase()
    .isIn(PLATFORMS)
    .withMessage(`Platform must be one of: ${PLATFORMS.join(', ')}`),
];
