'use strict';

const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { listReports, createReport, getReport, deleteReport } = require('./reports.controller');

/**
 * /api/reports
 * All routes require a valid JWT.
 */
router.get('/',     authenticate, listReports);
router.post('/',    authenticate, createReport);
router.get('/:id',  authenticate, getReport);
router.delete('/:id', authenticate, deleteReport);

module.exports = router;
