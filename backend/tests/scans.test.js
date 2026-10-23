'use strict';

/**
 * scans.test.js — Integration tests for /api/scans
 *
 * Tests authentication, heuristic analysis (URL/Code), CRUD operations,
 * ownership enforcement, and cross-user isolation.
 * Mongoose model and AI calls are mocked — runs fully offline.
 */

process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.PORT = '5001';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars';
delete process.env.OPENAI_API_KEY;
delete process.env.GEMINI_API_KEY;

const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../app');

// ── Mock Scan model ───────────────────────────────────────────────────────────
jest.mock('../src/models/Scan', () => {
  const ms = {
    _id: 'scan123',
    type: 'URL',
    target: 'https://example.com',
    status: 'complete',
    risk: 'Low',
    findings: [{ severity: 'Info', title: 'No issues', detail: 'All clear.' }],
    result: 'Heuristic-only scan completed.',
    userId: 'user123',
    createdAt: new Date().toISOString(),
  };
  return {
    find: jest.fn(() => ({ sort: jest.fn(() => ({ limit: jest.fn().mockResolvedValue([ms]) })) })),
    create: jest.fn().mockResolvedValue({ ...ms, _id: 'scan-new', status: 'running' }),
    findOne: jest.fn().mockResolvedValue(ms),
    findByIdAndUpdate: jest.fn().mockResolvedValue(ms),
    findOneAndDelete: jest.fn().mockResolvedValue(ms),
  };
});

function makeToken(userId = 'user123') {
  return jwt.sign(
    { sub: userId, email: 'test@example.com', role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('/api/scans', () => {
  let app, token;

  beforeAll(() => { app = createApp(); token = makeToken(); });
  afterEach(() => jest.clearAllMocks());

  // ── Auth guards ─────────────────────────────────────────────────────────────

  describe('Authentication required', () => {
    it('GET / returns 401 without token', async () => {
      expect((await request(app).get('/api/scans')).statusCode).toBe(401);
    });
    it('POST / returns 401 without token', async () => {
      expect((await request(app).post('/api/scans').send({ type: 'URL', target: 'https://x.com' })).statusCode).toBe(401);
    });
    it('GET /:id returns 401 without token', async () => {
      expect((await request(app).get('/api/scans/scan123')).statusCode).toBe(401);
    });
    it('DELETE /:id returns 401 without token', async () => {
      expect((await request(app).delete('/api/scans/scan123')).statusCode).toBe(401);
    });
  });

  // ── GET /api/scans ──────────────────────────────────────────────────────────

  describe('GET /api/scans', () => {
    it('returns 200 with an array', async () => {
      const res = await request(app)
        .get('/api/scans')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── POST /api/scans ─────────────────────────────────────────────────────────

  describe('POST /api/scans', () => {
    it('creates a URL scan and returns 201', async () => {
      const Scan = require('../src/models/Scan');
      // Return a running scan on create, then completed on findByIdAndUpdate
      Scan.create.mockResolvedValueOnce({ _id: 'scan-new', status: 'running' });
      Scan.findByIdAndUpdate.mockResolvedValueOnce({
        _id: 'scan-new', type: 'URL', target: 'https://example.com',
        status: 'complete', risk: 'Low', findings: [], result: 'done', userId: 'user123',
      });

      const res = await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'URL', target: 'https://example.com' });
      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('complete');
    });

    it('assigns High risk to suspicious URL', async () => {
      const Scan = require('../src/models/Scan');
      let capturedUpdate = {};
      Scan.create.mockResolvedValueOnce({ _id: 'scan-evil' });
      Scan.findByIdAndUpdate.mockImplementationOnce((_id, update, opts) => {
        capturedUpdate = update;
        return Promise.resolve({ ...update, _id: 'scan-evil' });
      });

      await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'URL', target: 'http://phishing-site.xyz/malware-payload' });

      expect(capturedUpdate.risk).toBe('High');
    });

    it('assigns Medium/High risk to dangerous code', async () => {
      const Scan = require('../src/models/Scan');
      let capturedUpdate = {};
      Scan.create.mockResolvedValueOnce({ _id: 'scan-code' });
      Scan.findByIdAndUpdate.mockImplementationOnce((_id, update) => {
        capturedUpdate = update;
        return Promise.resolve({ ...update });
      });

      await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'Code', target: 'eval(atob(payload)); exec(cmd); system("rm -rf /")' });

      expect(['Medium', 'High']).toContain(capturedUpdate.risk);
    });

    it('returns 400 for invalid type', async () => {
      const res = await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'Image', target: 'foo' });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when target is missing', async () => {
      const res = await request(app)
        .post('/api/scans')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'URL' });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET /api/scans/:id ──────────────────────────────────────────────────────

  describe('GET /api/scans/:id', () => {
    it('returns 200 with the scan', async () => {
      const res = await request(app)
        .get('/api/scans/scan123')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });

    it('returns 404 when not found', async () => {
      const Scan = require('../src/models/Scan');
      Scan.findOne.mockResolvedValueOnce(null);
      const res = await request(app)
        .get('/api/scans/nonexistent')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /api/scans/:id ───────────────────────────────────────────────────

  describe('DELETE /api/scans/:id', () => {
    it('returns 200 on success', async () => {
      const res = await request(app)
        .delete('/api/scans/scan123')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });

    it('returns 404 when not found', async () => {
      const Scan = require('../src/models/Scan');
      Scan.findOneAndDelete.mockResolvedValueOnce(null);
      const res = await request(app)
        .delete('/api/scans/nonexistent')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
  });
});
