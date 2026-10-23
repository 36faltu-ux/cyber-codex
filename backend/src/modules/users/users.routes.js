'use strict';

const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { getProfile, updateProfile, deleteAccount } = require('./users.controller');

/**
 * /api/users
 * All routes require a valid JWT.
 */
router.get('/me',    authenticate, getProfile);
router.put('/me',    authenticate, updateProfile);
router.delete('/me', authenticate, deleteAccount);

module.exports = router;
