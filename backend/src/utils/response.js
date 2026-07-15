/**
 * Centralized API response helpers.
 * Every response from the application must go through one of these helpers
 * to guarantee a consistent JSON envelope.
 *
 * Envelope shape:
 * {
 *   success: boolean,
 *   message: string,
 *   data: any | null,
 *   errors: any | null,    (only on failure)
 *   meta: object | null,   (pagination, counts, etc.)
 * }
 */

const send = (res, statusCode, success, message, payload = {}) => {
  const body = { success, message };

  if (payload.data !== undefined) body.data = payload.data;
  if (payload.errors !== undefined) body.errors = payload.errors;
  if (payload.meta !== undefined) body.meta = payload.meta;

  return res.status(statusCode).json(body);
};

// 2xx
export const success = (res, data = null, message = 'Success', meta = null) =>
  send(res, 200, true, message, { data, ...(meta && { meta }) });

export const created = (res, data = null, message = 'Created successfully') =>
  send(res, 201, true, message, { data });

// 4xx
export const badRequest = (res, message = 'Bad request', errors = null) =>
  send(res, 400, false, message, { ...(errors && { errors }) });

export const unauthorized = (res, message = 'Authentication required') =>
  send(res, 401, false, message);

export const forbidden = (res, message = 'Access denied') =>
  send(res, 403, false, message);

export const notFound = (res, message = 'Resource not found') =>
  send(res, 404, false, message);

export const conflict = (res, message = 'Resource already exists') =>
  send(res, 409, false, message);

export const tooManyRequests = (res, message = 'Too many requests') =>
  send(res, 429, false, message);

// 5xx
export const serverError = (res, message = 'Internal server error') =>
  send(res, 500, false, message);
