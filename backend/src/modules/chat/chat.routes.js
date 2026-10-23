'use strict';

const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { sendMessage, getHistory, clearHistory } = require('./chat.controller');

/**
 * /api/chat
 * All routes require a valid JWT.
 */
router.post('/',           authenticate, sendMessage);
router.get('/history',     authenticate, getHistory);
router.delete('/history',  authenticate, clearHistory);

module.exports = router;
