'use strict';

/**
 * Environment configuration — validates required variables at startup.
 * Importing this module in server.js ensures the process exits immediately
 * with a clear message if the environment is misconfigured.
 */

const REQUIRED = ['MONGO_URI', 'PORT'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `[env] Missing required environment variables: ${missing.join(', ')}\n` +
    `      Copy backend/.env.example to backend/.env and fill in the values.`
  );
  process.exit(1);
}

// JWT_SECRET — required in production, auto-generated in development with a warning
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[env] JWT_SECRET is required in production. Set it in backend/.env');
    process.exit(1);
  }
  // Development fallback — random per-process secret (sessions reset on restart)
  const crypto = require('crypto');
  jwtSecret = crypto.randomBytes(64).toString('hex');
  console.warn(
    '[env] WARNING: JWT_SECRET not set. Using a random in-memory secret.\n' +
    '      All sessions will be invalidated on server restart.\n' +
    '      Set JWT_SECRET in backend/.env for persistent sessions.'
  );
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI,
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS — comma-separated list of allowed origins
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),

  // JWT
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,

  // AI provider keys (optional — used by chat, scans, and reports modules)
  // If neither is set, those features fall back to demo/heuristic mode.
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || null,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || null,
};
