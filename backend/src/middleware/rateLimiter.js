'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * General API rate limiter.
 * Applied globally to /api/* routes.
 */
const apiLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs, // default: 15 minutes
  max: env.rateLimitMax,           // default: 200 requests per window
  standardHeaders: true,           // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

/**
 * Stricter limiter for sensitive write operations
 * (auth routes, scan submissions, etc.)
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests to this endpoint. Please wait and try again.' },
});

module.exports = { apiLimiter, strictLimiter };
