'use strict';

const Joi = require('joi');

/**
 * validate(schema, target) — Joi validation middleware factory.
 *
 * @param {Joi.ObjectSchema} schema  - Joi schema to validate against
 * @param {'body'|'query'|'params'} target - Which part of req to validate
 *
 * Usage:
 *   router.post('/register', validate(registerSchema, 'body'), handler);
 *
 * On validation failure, returns 400 with the first human-readable error message.
 * abortEarly:false collects all errors so the frontend can display them together.
 */
function validate(schema, target = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,      // Collect all errors, not just the first
      stripUnknown: true,     // Remove any fields not in the schema (mass-assignment protection)
      convert: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message).join('; ');
      return res.status(400).json({ error: messages });
    }

    // Replace req[target] with the sanitised/coerced value
    req[target] = value;
    next();
  };
}

// ── Auth schemas ─────────────────────────────────────────────────────────────

const registerSchema = Joi.object({
  email: Joi.string().email().max(254).required().messages({
    'string.email': 'Enter a valid email address.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Password must be at least 8 characters.',
    'any.required': 'Password is required.',
  }),
  displayName: Joi.string().max(100).allow('').default(''),
});

const loginSchema = Joi.object({
  email: Joi.string().email().max(254).required().messages({
    'string.email': 'Enter a valid email address.',
    'any.required': 'Email is required.',
  }),
  password: Joi.string().max(128).required().messages({
    'any.required': 'Password is required.',
  }),
});

// ── Project schemas ───────────────────────────────────────────────────────────

const createProjectSchema = Joi.object({
  title: Joi.string().trim().max(200).required().messages({
    'any.required': 'Project title is required.',
    'string.empty': 'Project title is required.',
  }),
  description: Joi.string().trim().max(2000).allow('').default(''),
});

const updateProjectSchema = Joi.object({
  title: Joi.string().trim().max(200),
  description: Joi.string().trim().max(2000).allow(''),
}).min(1).messages({ 'object.min': 'Provide at least one field to update.' });

// ── Task schemas ──────────────────────────────────────────────────────────────

const createTaskSchema = Joi.object({
  title: Joi.string().trim().max(500).required().messages({
    'any.required': 'Task title is required.',
    'string.empty': 'Task title is required.',
  }),
  due: Joi.string().trim().max(100).allow('').default('No due date'),
  done: Joi.boolean().default(false),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().max(500),
  due: Joi.string().trim().max(100).allow(''),
  done: Joi.boolean(),
}).min(1).messages({ 'object.min': 'Provide at least one field to update.' });

module.exports = {
  validate,
  schemas: {
    registerSchema,
    loginSchema,
    createProjectSchema,
    updateProjectSchema,
    createTaskSchema,
    updateTaskSchema,
  },
};
