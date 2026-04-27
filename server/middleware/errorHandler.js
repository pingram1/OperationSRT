const logger = require('../utils/logger');
const { captureServerException } = require('../utils/sentry');

/**
 * Centralized error handling middleware.
 *
 * Canonical error envelope:
 *
 *   { success: false, message, code?, errors? }
 *
 * - `message` is always present and is safe to show to a client.
 * - `code` (optional) is a stable, machine-readable string for clients to
 *   branch on (e.g. 'INVALID_INPUT', 'STRIPE_NOT_CONFIGURED'). It is set
 *   by ApiError or by domain controllers.
 * - `errors` (optional) is an array of `{ path, msg }` field-level errors,
 *   matching what express-validator produces. For backward compatibility
 *   we also pass through an `err.errors` object (e.g. Mongoose validation
 *   errors) untouched.
 *
 * In development, the response also includes `error` (raw message) and
 * `stack`. These are NEVER included in production.
 */
const errorHandler = (err, req, res, next) => {
  const requestId = req.requestId;
  logger.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    requestId,
  });

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code && typeof err.code === 'string' ? err.code : undefined;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    code = code || 'VALIDATION_ERROR';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = code || 'INVALID_ID';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = code || 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = code || 'TOKEN_EXPIRED';
  } else if (err.name === 'MongoServerError') {
    if (err.code === 11000) {
      statusCode = 409;
      message = 'Duplicate entry';
      code = 'DUPLICATE';
    } else {
      statusCode = 500;
      message = 'Database error';
      // Don't carry through err.code (numeric MongoDB code) for non-11000.
      code = undefined;
    }
  } else if (err.name === 'MongooseError') {
    statusCode = 400;
    message = 'Database operation failed';
    code = code || 'DB_OPERATION_FAILED';
  }

  if (statusCode >= 500) {
    captureServerException(err, req);
  }

  const isClientError = statusCode >= 400 && statusCode < 500;
  const isDev = process.env.NODE_ENV === 'development';
  const shouldExposeDetails = isDev || isClientError;

  const errorResponse = {
    success: false,
    message: shouldExposeDetails ? message : 'An error occurred',
  };

  if (requestId) {
    errorResponse.requestId = requestId;
  }

  if (code) {
    errorResponse.code = code;
  }

  // Pass through field-level error details when present.
  // Accept both array shape (express-validator: [{path, msg}]) and the legacy
  // object shape (Mongoose: { email: { message } }).
  if (err.errors) {
    errorResponse.errors = err.errors;
  }

  if (isDev) {
    errorResponse.error = err.message;
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
