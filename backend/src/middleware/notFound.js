/**
 * 404 catch-all middleware.
 * Register this AFTER all routes but BEFORE the error handler.
 */

import { NotFoundError } from '../utils/errors.js';

const notFound = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
};

export default notFound;
