'use strict';

/**
 * projects.test.js — Integration tests for /api/projects
 *
 * Uses supertest against the Express app (no real DB).
 * Mongoose model methods are mocked so tests run offline.
 */

process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.PORT = '5001';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const createApp = require('../app');

// ── Mock the Project model ────────────────────────────────────────────────────
jest.mock('../src/models/Project', () => {
  const mockProject = {
    _id: 'proj123',
    title: 'Test Project',
    description: '',
    createdAt: new Date().toISOString(),
  };

  const Model = {
    find: jest.fn(() => ({ sort: jest.fn().mockResolvedValue([mockProject]) })),
    create: jest.fn().mockResolvedValue(mockProject),
    findByIdAndUpdate: jest.fn().mockResolvedValue(mockProject),
    findByIdAndDelete: jest.fn().mockResolvedValue(mockProject),
  };
  return Model;
});

describe('/api/projects', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /api/projects', () => {
    it('returns 200 with an array', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/projects', () => {
    it('creates a project and returns 201', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({ title: 'Test Project' });
      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('Test Project');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/api/projects').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns 400 when title is only whitespace', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({ title: '   ' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('updates a project and returns 200', async () => {
      const res = await request(app)
        .put('/api/projects/proj123')
        .send({ title: 'Updated Project' });
      expect(res.statusCode).toBe(200);
    });

    it('returns 404 when project not found', async () => {
      const Project = require('../src/models/Project');
      Project.findByIdAndUpdate.mockResolvedValueOnce(null);

      const res = await request(app)
        .put('/api/projects/nonexistent')
        .send({ title: 'X' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('deletes a project and returns 200', async () => {
      const res = await request(app).delete('/api/projects/proj123');
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('returns 404 when project not found', async () => {
      const Project = require('../src/models/Project');
      Project.findByIdAndDelete.mockResolvedValueOnce(null);

      const res = await request(app).delete('/api/projects/nonexistent');
      expect(res.statusCode).toBe(404);
    });
  });
});
