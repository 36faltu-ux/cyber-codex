'use strict';

const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { listScans, createScan, getScan, deleteScan } = require('./scans.controller');

/**
 * /api/scans
 * All routes require a valid JWT.
 */
router.get('/',     authenticate, listScans);
router.post('/',    authenticate, createScan);
router.get('/:id',  authenticate, getScan);
router.delete('/:id', authenticate, deleteScan);

module.exports = router;
