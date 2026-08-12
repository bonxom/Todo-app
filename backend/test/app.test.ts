import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({
  connectDB: vi.fn().mockResolvedValue({}),
}));

beforeAll(() => {
  process.env.MONGO_URI = 'mongodb://test.invalid/todo';
  process.env.JWT_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.SALT_ROUNDS = '10';
});

describe('application error integration', () => {
  it('keeps the root success response unchanged', async () => {
    const { default: app } = await import('../app.js');
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toBe('This is backend of Todo App');
  });

  it('keeps the health success response unchanged', async () => {
    const { default: app } = await import('../app.js');
    const response = await request(app).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('returns the new error fields without an envelope or tracing fields', async () => {
    const { default: app } = await import('../app.js');
    const response = await request(app).get('/route-that-does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'COMMON_0002',
      message: 'Route GET /route-that-does-not-exist not found',
    });
    expect(response.body).not.toHaveProperty('error');
    expect(response.body).not.toHaveProperty('timestamp');
    expect(response.body).not.toHaveProperty('requestId');
  });

  it('keeps authentication failures at HTTP 401 for the frontend refresh flow', async () => {
    const { default: app } = await import('../app.js');
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_0001');
    expect(response.body.message).toEqual(expect.any(String));
  });

  it('returns the specific missing refresh-token error for an omitted body', async () => {
    const { default: app } = await import('../app.js');
    const response = await request(app).post('/api/auth/refresh');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_0004');
  });

  it('keeps logout without a refresh-token body backward compatible', async () => {
    const { default: app } = await import('../app.js');
    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Logout successful' });
  });
});
