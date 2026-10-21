'use strict';

const morgan = require('morgan');
const env = require('../config/env');

/**
 * Creates an HTTP request logger using morgan.
 *
 * - Development: 'dev' format (coloured, concise)
 * - Production:  'combined' format (Apache-style, for log aggregation)
 *
 * Sensitive headers (Authorization, Cookie) are never logged —
 * morgan only logs request-line, status, size, and timing.
 */
const httpLogger = morgan(env.nodeEnv === 'production' ? 'combined' : 'dev');

module.exports = { httpLogger };
