const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
require('dotenv').config();

try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.log('DNS configuration skipped');
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Database models
const Project = mongoose.model(
  'Project',
  new mongoose.Schema(
    {
      title: { type: String, required: true, trim: true },
      description: { type: String, default: '' },
    },
    { timestamps: true }
  )
);

const Task = mongoose.model(
  'Task',
  new mongoose.Schema(
    {
      title: { type: String, required: true, trim: true },
      due: { type: String, default: 'No due date' },
      done: { type: Boolean, default: false },
    },
    { timestamps: true }
  )
);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CYBER-AGENT AI backend running' });
});

// Projects routes
app.get('/api/projects', async (req, res) => {
  try {
    res.json(await Project.find().sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ error: 'Could not load projects' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const title = req.body.title?.trim();
    if (!title) return res.status(400).json({ error: 'Project title is required' });

    const project = await Project.create({
      title,
      description: req.body.description || '',
    });
    res.status(201).json(project);
  } catch {
    res.status(500).json({ error: 'Could not create project' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { title: req.body.title, description: req.body.description },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch {
    res.status(400).json({ error: 'Invalid project data or ID' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch {
    res.status(400).json({ error: 'Invalid project ID' });
  }
});

// Tasks routes
app.get('/api/tasks', async (req, res) => {
  try {
    res.json(await Task.find().sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ error: 'Could not load tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const title = req.body.title?.trim();
    if (!title) return res.status(400).json({ error: 'Task title is required' });

    const task = await Task.create({
      title,
      due: req.body.due || 'No due date',
      done: Boolean(req.body.done),
    });
    res.status(201).json(task);
  } catch {
    res.status(500).json({ error: 'Could not create task' });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body.title === 'string') updates.title = req.body.title.trim();
    if (typeof req.body.due === 'string') updates.due = req.body.due;
    if (typeof req.body.done === 'boolean') updates.done = req.body.done;

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch {
    res.status(400).json({ error: 'Invalid task data or ID' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch {
    res.status(400).json({ error: 'Invalid task ID' });
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI missing. Set it in backend/.env');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { family: 4 })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });