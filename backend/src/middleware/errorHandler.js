'use strict';

const env = require('../config/env');

/**
 * Centralized error handler — must be registered LAST in app.js.
 *
 * Formats errors into a consistent JSON shape:
 *   { error: string, ...(details in non-production) }
 *
 * Never leaks stack traces to clients in production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join('; ') });
  }

  // Mongoose duplicate-key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ error: `Duplicate value for ${field}.` });
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format.' });
  }

  // JWT errors (used from Phase 3)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  // HTTP errors with an explicit statusCode attached
  const status = err.statusCode || err.status || 500;

  const body = { error: err.message || 'Internal server error.' };

  // Include stack trace only in development
  if (env.nodeEnv === 'development' && err.stack) {
    body.stack = err.stack;
  }

  // Log 5xx errors server-side
  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json(body);
}

module.exports = errorHandler;
