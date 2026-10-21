'use strict';

/**
 * server.js — Process entry point.
 *
 * Responsibilities:
 *   1. Load environment variables
 *   2. Validate environment (env.js exits if required vars are missing)
 *   3. Connect to MongoDB
 *   4. Start the HTTP server
 *   5. Handle graceful shutdown on SIGTERM / SIGINT
 *
 * Application logic, middleware, and route definitions live in app.js.
 */

require('dotenv').config();

const env = require('./src/config/env');           // validates env vars first
const { connectDB, disconnectDB } = require('./src/config/db');
const createApp = require('./app');

const app = createApp();
let server;

async function start() {
  // Fix DNS resolution order for MongoDB Atlas on some networks (Termux, Windows)
  try {
    const dns = require('dns');
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch {
    console.log('[server] DNS configuration skipped');
  }

  await connectDB();

  server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`[server] CYBER-AGENT AI backend running on port ${env.port}`);
    console.log(`[server] Environment: ${env.nodeEnv}`);
    console.log(`[server] CORS allowed origins: ${env.corsOrigins.join(', ')}`);
  });
}

async function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down gracefully…`);
  if (server) {
    server.close(async () => {
      await disconnectDB();
      console.log('[server] Shutdown complete.');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
  shutdown('unhandledRejection').catch(() => process.exit(1));
});

start().catch((err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});