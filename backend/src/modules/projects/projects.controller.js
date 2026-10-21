'use strict';

const Project = require('../../models/Project');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * GET /api/projects
 * Returns all projects sorted newest-first.
 * Phase 3: will filter by req.user._id.
 */
const listProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 });
  res.json(projects);
});

/**
 * POST /api/projects
 * Creates a new project.
 * Body: { title: string, description?: string }
 */
const createProject = asyncHandler(async (req, res) => {
  const title = (req.body.title || '').toString().trim();
  if (!title) {
    return res.status(400).json({ error: 'Project title is required.' });
  }

  const project = await Project.create({
    title,
    description: (req.body.description || '').toString().trim(),
    // Phase 3: userId: req.user._id
  });

  res.status(201).json(project);
});

/**
 * PUT /api/projects/:id
 * Updates title and/or description of an existing project.
 * Body: { title?: string, description?: string }
 */
const updateProject = asyncHandler(async (req, res) => {
  const updates = {};

  if (typeof req.body.title === 'string') {
    const title = req.body.title.trim();
    if (!title) return res.status(400).json({ error: 'Project title cannot be blank.' });
    updates.title = title;
  }
  if (typeof req.body.description === 'string') {
    updates.description = req.body.description.trim();
  }

  const project = await Project.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  if (!project) return res.status(404).json({ error: 'Project not found.' });
  res.json(project);
});

/**
 * DELETE /api/projects/:id
 * Permanently deletes a project.
 */
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  res.json({ message: 'Project deleted successfully.' });
});

module.exports = { listProjects, createProject, updateProject, deleteProject };
