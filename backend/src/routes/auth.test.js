jest.mock('isomorphic-dompurify', () => () => ({ sanitize: (value) => value }));

const express = require('express');
const request = require('supertest');
const authRoutes = require('./auth.routes');
const errorHandler = require('../middleware/errorHandler');
const AuthService = require('../services/auth.service');

jest.mock('../services/auth.service');
jest.mock('../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('POST /api/auth/login', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
    jest.clearAllMocks();
  });

  it('should return tokens with valid credentials', async () => {
    AuthService.loginUser.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'test@example.com', role: 'admin' },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('accessToken', 'access-token');
    expect(res.body).toHaveProperty('refreshToken', 'refresh-token');
  });

  it('should return 401 with invalid credentials', async () => {
    const error = new Error('Invalid credentials.');
    error.statusCode = 401;
    AuthService.loginUser.mockRejectedValue(error);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@example.com', password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
  });
});
