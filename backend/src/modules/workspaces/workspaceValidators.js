import { param, body, query } from 'express-validator';
import { handleValidationErrors } from '../auth/authValidators.js';

const WORKSPACE_ROLES = ['admin', 'editor', 'viewer'];

export const validateCreateWorkspace = [
  body('name')
    .isString().trim().notEmpty().withMessage('name is required')
    .isLength({ max: 100 }).withMessage('name must be at most 100 characters'),
  body('description')
    .optional().isString().isLength({ max: 500 }).withMessage('description must be at most 500 characters'),
  body('slug')
    .optional().isString().trim().isLength({ max: 60 })
    .matches(/^[a-z0-9-]+$/).withMessage('slug may only contain lowercase letters, numbers, and hyphens'),
  handleValidationErrors,
];

export const validateWorkspaceId = [
  param('id').isMongoId().withMessage('id must be a valid ObjectId'),
  handleValidationErrors,
];

export const validateUpdateWorkspace = [
  param('id').isMongoId().withMessage('id must be a valid ObjectId'),
  body('name')
    .optional().isString().trim().isLength({ max: 100 }).withMessage('name must be at most 100 characters'),
  body('description')
    .optional().isString().isLength({ max: 500 }).withMessage('description must be at most 500 characters'),
  handleValidationErrors,
];

export const validateInviteMember = [
  param('id').isMongoId().withMessage('workspace id must be a valid ObjectId'),
  body('userId').isMongoId().withMessage('userId must be a valid ObjectId'),
  body('role')
    .optional().isIn(WORKSPACE_ROLES)
    .withMessage(`role must be one of: ${WORKSPACE_ROLES.join(', ')}`),
  handleValidationErrors,
];

export const validateUpdateMember = [
  param('id').isMongoId().withMessage('workspace id must be a valid ObjectId'),
  param('user').isMongoId().withMessage('user id must be a valid ObjectId'),
  body('role')
    .isIn(WORKSPACE_ROLES)
    .withMessage(`role must be one of: ${WORKSPACE_ROLES.join(', ')}`),
  handleValidationErrors,
];

export const validateRemoveMember = [
  param('id').isMongoId().withMessage('workspace id must be a valid ObjectId'),
  param('user').isMongoId().withMessage('user id must be a valid ObjectId'),
  handleValidationErrors,
];
