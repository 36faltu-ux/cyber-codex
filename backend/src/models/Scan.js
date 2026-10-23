'use strict';

const mongoose = require('mongoose');

/**
 * Scan model
 *
 * Stores submitted scan requests per user. The actual analysis
 * result is stored in the `result` field once completed.
 */
const scanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Scan must belong to a user.'],
      index: true,
    },
    type: {
      type: String,
      enum: ['URL', 'Code', 'File'],
      required: true,
    },
    target: {
      type: String,
      required: true,
      maxlength: [4096, 'Target too long.'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'complete', 'error'],
      default: 'pending',
    },
    risk: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical', 'Unknown'],
      default: 'Unknown',
    },
    // Freeform analysis result (summary, findings, AI output)
    result: {
      type: String,
      default: null,
    },
    // Structured findings array (future use)
    findings: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Scan', scanSchema);
