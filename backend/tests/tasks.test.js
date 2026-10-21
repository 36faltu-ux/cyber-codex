'use strict';

/**
 * tasks.test.js — Integration tests for /api/tasks
 */

process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.PORT = '5001';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const createApp = require('../app');

jest.mock('../src/models/Task', () => {
  const mockTask = {
    _id: 'task123',
    title: 'Test Task',
    due: 'No due date',
    done: false,
    createdAt: new Date().toISOString(),
  };

  return {
    find: jest.fn(() => ({ sort: jest.fn().mockResolvedValue([mockTask]) })),
    create: jest.fn().mockResolvedValue(mockTask),
    findByIdAndUpdate: jest.fn().mockResolvedValue(mockTask),
    findByIdAndDelete: jest.fn().mockResolvedValue(mockTask),
  };
});

describe('/api/tasks', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /api/tasks', () => {
    it('returns 200 with an array', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/tasks', () => {
    it('creates a task and returns 201', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test Task', due: 'Oct 25' });
      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('Test Task');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/api/tasks').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('toggles done state and returns 200', async () => {
      const res = await request(app)
        .put('/api/tasks/task123')
        .send({ done: true });
      expect(res.statusCode).toBe(200);
    });

    it('returns 400 when no valid fields provided', async () => {
      const res = await request(app)
        .put('/api/tasks/task123')
        .send({});
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when task not found', async () => {
      const Task = require('../src/models/Task');
      Task.findByIdAndUpdate.mockResolvedValueOnce(null);

      const res = await request(app)
        .put('/api/tasks/nonexistent')
        .send({ done: true });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deletes a task and returns 200', async () => {
      const res = await request(app).delete('/api/tasks/task123');
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('returns 404 when task not found', async () => {
      const Task = require('../src/models/Task');
      Task.findByIdAndDelete.mockResolvedValueOnce(null);

      const res = await request(app).delete('/api/tasks/nonexistent');
      expect(res.statusCode).toBe(404);
    });
  });
});
