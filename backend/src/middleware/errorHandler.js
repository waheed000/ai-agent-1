/**
 * Centralized error-handling middleware.
 * Must be registered LAST in the Express middleware chain (4-argument signature).
 *
 * Rules:
 * - Operational AppErrors → return their statusCode + message.
 * - Mongoose/MongoDB errors → normalize and return 4xx.
 * - Unknown errors → 500, no stack trace in production.
 */

import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AppError, ValidationError } from '../utils/errors.js';

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Normalize to AppError when possible
  let error = err;

  // Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    error = new AppError(`Invalid value for field '${err.path}': ${err.value}`, 400, 'CAST_ERROR');
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = new ValidationError('Validation failed', details);
  }

  // MongoDB duplicate key (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = new AppError(`A record with this ${field} already exists`, 409, 'DUPLICATE_KEY');
  }

  // JWT errors (left here as stubs for Phase 3)
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token has expired', 401, 'TOKEN_EXPIRED');
  }

  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational === true;

  // Log non-operational (unexpected) errors with full stack
  if (!isOperational) {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn('Operational error', {
      code: error.code,
      message: error.message,
      statusCode,
      url: req.originalUrl,
    });
  }

  const body = {
    success: false,
    message: isOperational ? error.message : 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
  };

  if (error.details) body.errors = error.details;

  // Expose stack only in development for debugging
  if (!config.isProduction && !isOperational) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

export default errorHandler;
