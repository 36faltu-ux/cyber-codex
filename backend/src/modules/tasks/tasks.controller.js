'use strict';

const Task = require('../../models/Task');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * GET /api/tasks
 * Returns all tasks sorted newest-first.
 * Phase 3: will filter by req.user._id.
 */
const listTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find().sort({ createdAt: -1 });
  res.json(tasks);
});

/**
 * POST /api/tasks
 * Creates a new task.
 * Body: { title: string, due?: string, done?: boolean }
 */
const createTask = asyncHandler(async (req, res) => {
  const title = (req.body.title || '').toString().trim();
  if (!title) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  const task = await Task.create({
    title,
    due: (req.body.due || 'No due date').toString().trim(),
    done: Boolean(req.body.done),
    // Phase 3: userId: req.user._id
  });

  res.status(201).json(task);
});

/**
 * PUT /api/tasks/:id
 * Updates one or more fields of an existing task.
 * Body: { title?: string, due?: string, done?: boolean }
 */
const updateTask = asyncHandler(async (req, res) => {
  const updates = {};

  if (typeof req.body.title === 'string') {
    const title = req.body.title.trim();
    if (!title) return res.status(400).json({ error: 'Task title cannot be blank.' });
    updates.title = title;
  }
  if (typeof req.body.due === 'string') {
    updates.due = req.body.due.trim();
  }
  if (typeof req.body.done === 'boolean') {
    updates.done = req.body.done;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update.' });
  }

  const task = await Task.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  if (!task) return res.status(404).json({ error: 'Task not found.' });
  res.json(task);
});

/**
 * DELETE /api/tasks/:id
 * Permanently deletes a task.
 */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  res.json({ message: 'Task deleted successfully.' });
});

module.exports = { listTasks, createTask, updateTask, deleteTask };
