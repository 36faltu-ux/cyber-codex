'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./src/config/env');
const { httpLogger } = require('./src/utils/logger');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const errorHandler = require('./src/middleware/errorHandler');

// Feature routers
const authRouter = require('./src/modules/auth/auth.routes');
const projectsRouter = require('./src/modules/projects/projects.routes');
const tasksRouter = require('./src/modules/tasks/tasks.routes');

function createApp() {
  const app = express();

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ────────────────────────────────────────────────────────────────────
  // Restricted to the configured frontend origins (default: localhost:5173).
  // Add additional origins via CORS_ORIGINS in .env (comma-separated).
  app.use(
    cors({
      origin: env.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // ── HTTP request logging ────────────────────────────────────────────────────
  app.use(httpLogger);

  // ── Body parsers ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // ── Global rate limiter ─────────────────────────────────────────────────────
  app.use('/api/', apiLimiter);

  // ── Health check ────────────────────────────────────────────────────────────
  // Intentionally placed before auth so monitoring tools can reach it freely.
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'CYBER-AGENT AI',
      env: env.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Feature routes ──────────────────────────────────────────────────────────
  app.use('/api/auth', authRouter);       // Phase 3: Authentication
  app.use('/api/projects', projectsRouter); // Phase 4: will add authenticate middleware
  app.use('/api/tasks', tasksRouter);       // Phase 4: will add authenticate middleware
  // Phase 4+: scans, chat, reports, stats routers added here

  // ── 404 handler ─────────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
  });

  // ── Centralized error handler ────────────────────────────────────────────────
  // Must be last — Express identifies it by 4-parameter signature.
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
