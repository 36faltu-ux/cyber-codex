'use strict';

const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { strictLimiter } = require('../../middleware/rateLimiter');
const { validate, schemas } = require('../../middleware/validate');
const { register, login, getMe, logout } = require('./auth.controller');

/**
 * /api/auth
 *
 * Stricter rate limiter applied to registration and login to
 * slow down brute-force and credential-stuffing attacks.
 */

// Public routes
router.post('/register', strictLimiter, validate(schemas.registerSchema), register);
router.post('/login',    strictLimiter, validate(schemas.loginSchema),    login);

// Protected routes (require valid JWT)
router.get('/me',     authenticate, getMe);
router.post('/logout', authenticate, logout);

module.exports = router;
