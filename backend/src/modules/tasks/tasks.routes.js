'use strict';

const router = require('express').Router();
const {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
} = require('./tasks.controller');

/**
 * /api/tasks
 */
router.get('/', listTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
