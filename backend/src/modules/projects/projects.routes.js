'use strict';

const router = require('express').Router();
const {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} = require('./projects.controller');

/**
 * /api/projects
 */
router.get('/', listProjects);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
