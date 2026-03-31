const logger = require('../utils/logger');
const { captureServerException } = require('../utils/sentry');

/**
 * Centralized error handling middleware
 * Formats errors consistently and hides sensitive information in production
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });

  // Default error
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err.name === 'MongoServerError') {
    if (err.code === 11000) {
      statusCode = 409;
      message = 'Duplicate entry';
    } else {
      statusCode = 500;
      message = 'Database error';
    }
  } else if (err.name === 'MongooseError') {
    statusCode = 400;
    message = 'Database operation failed';
  }

  if (statusCode >= 500) {
    captureServerException(err, req);
  }

  // Don't expose error details in production unless it's a client error (4xx)
  const isClientError = statusCode >= 400 && statusCode < 500;
  const shouldExposeDetails = process.env.NODE_ENV === 'development' || isClientError;

  // Prepare error response
  const errorResponse = {
    success: false,
    message: shouldExposeDetails ? message : 'An error occurred',
    ...(shouldExposeDetails && process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack,
    }),
  };

  // Add validation errors if present
  if (err.errors && typeof err.errors === 'object') {
    errorResponse.errors = err.errors;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;


