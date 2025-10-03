const request = require('supertest');
const server = require('../index');
const User = require('../models/user');

jest.mock('../models/user');

describe('POST /api/auth/login', () => {
  afterAll((done) => {
    server.close(done);
  });

  it('should return a token with valid credentials', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      comparePassword: jest.fn().mockResolvedValue(true),
    };
    User.findByEmail.mockResolvedValue(mockUser);

    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should return 401 with invalid credentials', async () => {
    User.findByEmail.mockResolvedValue(null);

    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: 'wrong@example.com', password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
  });
});
