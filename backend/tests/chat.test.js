'use strict';

/**
 * chat.test.js — Integration tests for /api/chat
 *
 * All AI calls are intercepted (we mock ChatMessage and do NOT call
 * external APIs). The controller's demo-mode fallback is tested so
 * tests pass even without OPENAI_API_KEY / GEMINI_API_KEY.
 */

process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.PORT = '5001';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars';
// Ensure no real AI key is active during tests
delete process.env.OPENAI_API_KEY;
delete process.env.GEMINI_API_KEY;

const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../app');

// ── Mock ChatMessage model ────────────────────────────────────────────────────
jest.mock('../src/models/ChatMessage', () => {
  const mt = {
    _id: 'msg123',
    userId: 'user123',
    role: 'assistant',
    content: 'Demo response',
    createdAt: new Date().toISOString(),
  };
  const historyMessages = [
    { _id: 'msg1', role: 'user',      content: 'hello',    createdAt: new Date() },
    { _id: 'msg2', role: 'assistant', content: 'hi there', createdAt: new Date() },
  ];
  return {
    create: jest.fn().mockResolvedValue(mt),
    find: jest.fn(() => ({
      sort: jest.fn(() => ({
        limit: jest.fn(() => ({
          lean: jest.fn().mockResolvedValue(historyMessages), // chat controller uses .lean()
        })),
      })),
    })),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
  };
});

// ── Helper ────────────────────────────────────────────────────────────────────

function makeToken(userId = 'user123') {
  return jwt.sign(
    { sub: userId, email: 'test@example.com', role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('/api/chat', () => {
  let app, token;

  beforeAll(() => {
    app = createApp();
    token = makeToken();
  });

  afterEach(() => jest.clearAllMocks());

  // ── Auth guard ──────────────────────────────────────────────────────────────

  describe('Authentication required', () => {
    it('POST / returns 401 without token', async () => {
      const res = await request(app).post('/api/chat').send({ message: 'hello' });
      expect(res.statusCode).toBe(401);
    });

    it('GET /history returns 401 without token', async () => {
      const res = await request(app).get('/api/chat/history');
      expect(res.statusCode).toBe(401);
    });

    it('DELETE /history returns 401 without token', async () => {
      const res = await request(app).delete('/api/chat/history');
      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /api/chat ──────────────────────────────────────────────────────────

  describe('POST /api/chat', () => {
    it('returns 200 with a reply in demo mode (no AI key)', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'What is a SQL injection?' });

      expect(res.statusCode).toBe(200);
      expect(res.body.reply).toBeDefined();
      expect(typeof res.body.reply).toBe('string');
      expect(res.body.demo).toBe(true); // no API key configured
    });

    it('saves the user message to DB', async () => {
      const ChatMessage = require('../src/models/ChatMessage');
      await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Test message' });

      // create called at least once for the user message
      expect(ChatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'user', content: 'Test message' })
      );
    });

    it('returns 400 when message is empty', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: '   ' });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when message is missing', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET /api/chat/history ────────────────────────────────────────────────────

  describe('GET /api/chat/history', () => {
    it('returns 200 with an array of messages', async () => {
      const res = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── DELETE /api/chat/history ─────────────────────────────────────────────────

  describe('DELETE /api/chat/history', () => {
    it('returns 200 and clears history', async () => {
      const res = await request(app)
        .delete('/api/chat/history')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBeDefined();
    });
  });
});
