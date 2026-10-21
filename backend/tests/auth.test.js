'use strict';

/**
 * auth.test.js — Integration tests for /api/auth
 *
 * All Mongoose calls are mocked — tests run fully offline.
 * bcrypt is partially mocked to avoid slow hashing in tests.
 */

process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.PORT = '5001';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars';

const request = require('supertest');
const createApp = require('../app');

// ── Mock User model ───────────────────────────────────────────────────────────
const mockUser = {
  _id: 'user123',
  email: 'test@example.com',
  role: 'user',
  displayName: 'Test User',
  createdAt: new Date().toISOString(),
  passwordHash: '$2a$12$hashedpassword',
  comparePassword: jest.fn(),
  save: jest.fn(),
  toPublicJSON: jest.fn(() => ({
    _id: 'user123',
    email: 'test@example.com',
    role: 'user',
    displayName: 'Test User',
    createdAt: new Date().toISOString(),
  })),
};

jest.mock('../src/models/User', () => {
  const MockUser = jest.fn().mockImplementation(() => mockUser);
  MockUser.findOne = jest.fn();
  MockUser.findById = jest.fn();
  return MockUser;
});

describe('/api/auth/register', () => {
  let app;
  beforeAll(() => { app = createApp(); });
  afterEach(() => jest.clearAllMocks());

  it('returns 201 with token and user on success', async () => {
    mockUser.save.mockResolvedValueOnce();

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123' });

    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
    // Password hash must NEVER appear in the response
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'Password123' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'short' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'Password123' });
    expect(res.statusCode).toBe(400);
  });

  it('strips unknown fields (mass-assignment protection)', async () => {
    mockUser.save.mockResolvedValueOnce();
    const User = require('../src/models/User');
    let capturedArgs;
    User.mockImplementationOnce((args) => {
      capturedArgs = args;
      return mockUser;
    });

    await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123', role: 'admin', _id: 'hacked' });

    // role and _id injected by client must be stripped by Joi
    expect(capturedArgs).not.toHaveProperty('role');
    expect(capturedArgs).not.toHaveProperty('_id');
  });
});

describe('/api/auth/login', () => {
  let app;
  beforeAll(() => { app = createApp(); });
  afterEach(() => jest.clearAllMocks());

  it('returns 200 with token on valid credentials', async () => {
    const User = require('../src/models/User');
    User.findOne.mockReturnValueOnce({ select: jest.fn().mockResolvedValue(mockUser) });
    mockUser.comparePassword.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('returns 401 on wrong password', async () => {
    const User = require('../src/models/User');
    User.findOne.mockReturnValueOnce({ select: jest.fn().mockResolvedValue(mockUser) });
    mockUser.comparePassword.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword' });

    expect(res.statusCode).toBe(401);
    // Must NOT indicate whether email or password is wrong
    expect(res.body.error).toBe('Invalid email or password.');
  });

  it('returns 401 on unknown email (same message — no enumeration)', async () => {
    const User = require('../src/models/User');
    User.findOne.mockReturnValueOnce({ select: jest.fn().mockResolvedValue(null) });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password123' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid email or password.');
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
  });
});

describe('/api/auth/me', () => {
  let app;
  let validToken;

  beforeAll(() => {
    app = createApp();
    // Sign a token with the test secret to use in subsequent requests
    const jwt = require('jsonwebtoken');
    validToken = jwt.sign(
      { sub: 'user123', email: 'test@example.com', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });
  afterEach(() => jest.clearAllMocks());

  it('returns 200 with user when token is valid', async () => {
    const User = require('../src/models/User');
    User.findById.mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when token is signed with wrong secret', async () => {
    const jwt = require('jsonwebtoken');
    const wrongToken = jwt.sign({ sub: 'user123' }, 'wrong-secret', { expiresIn: '1h' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${wrongToken}`);
    expect(res.statusCode).toBe(401);
  });
});

describe('/api/auth/logout', () => {
  let app;
  let validToken;

  beforeAll(() => {
    app = createApp();
    const jwt = require('jsonwebtoken');
    validToken = jwt.sign(
      { sub: 'user123', email: 'test@example.com', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  it('returns 200 when authenticated', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.statusCode).toBe(401);
  });
});
