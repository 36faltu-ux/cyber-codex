'use strict';

const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;

/**
 * Connect to MongoDB Atlas.
 * Safe to call multiple times — re-uses the existing connection.
 */
async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(env.mongoUri, {
      family: 4, // Force IPv4 (required on some networks / Termux)
    });
    isConnected = true;
    console.log('[db] MongoDB connected');
  } catch (err) {
    console.error('[db] MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

/**
 * Gracefully close the MongoDB connection.
 * Called during process shutdown signals.
 */
async function disconnectDB() {
  if (!isConnected) return;
  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log('[db] MongoDB connection closed');
  } catch (err) {
    console.error('[db] Error closing MongoDB connection:', err.message);
  }
}

module.exports = { connectDB, disconnectDB };
