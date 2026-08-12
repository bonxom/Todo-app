import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../error/AppError.js';
import { AUTH_ERROR } from '../../error/definitions/authErrors.js';
import { errorHandler } from '../../error/errorHandler.js';
import { requestContext } from '../../error/requestContext.js';
import { protect, authorize } from '../../middlewares/auth.js';
import User from '../../models/User.js';
import { invalidatedTokenRepository } from '../../repositories/invalidatedTokenRepository.js';
import { userRepository } from '../../repositories/userRepository.js';
import type { IInvalidatedTokenDocument } from '../../types/IInvalidatedToken.js';
import type { IUserDocument } from '../../types/IUser.js';
import { authService } from '../authService.js';

const ACCESS_SECRET = 'test-access-secret';
const REFRESH_SECRET = 'test-refresh-secret';
const USER_ID = '507f1f77bcf86cd799439011';

const createAuthApp = (): express.Express => {
  const app = express();
  app.use(requestContext);
  app.get('/protected', protect, (_req, res) => res.json({ ok: true }));
  app.get(
    '/admin',
    (req, _res, next) => {
      req.user = { role: 'USER' } as IUserDocument;
      next();
    },
    authorize('ADMIN'),
    (_req, res) => res.json({ ok: true })
  );
  app.use(errorHandler);
  return app;
};

describe('access-token authentication', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = ACCESS_SECRET;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('distinguishes a missing Authorization header', async () => {
    const response = await request(createAuthApp()).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe(AUTH_ERROR.TOKEN_MISSING.code);
  });

  it.each(['Bearer', 'Bearer ', 'Basic token', 'Bearer token extra']) (
    'rejects malformed Bearer header %s',
    async (authorization) => {
      const response = await request(createAuthApp())
        .get('/protected')
        .set('Authorization', authorization);

      expect(response.status).toBe(401);
      expect(response.body.code).toBe(AUTH_ERROR.TOKEN_INVALID.code);
    }
  );

  it('distinguishes an invalid access token', async () => {
    const response = await request(createAuthApp())
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe(AUTH_ERROR.TOKEN_INVALID.code);
  });

  it('distinguishes an expired access token', async () => {
    const token = jwt.sign({ id: USER_ID }, ACCESS_SECRET, { expiresIn: -1 });
    const response = await request(createAuthApp())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe(AUTH_ERROR.TOKEN_EXPIRED.code);
  });

  it('returns unauthorized when the token user no longer exists', async () => {
    const token = jwt.sign({ id: USER_ID }, ACCESS_SECRET, { expiresIn: '5m' });
    vi.spyOn(User, 'findById').mockReturnValue({ select: vi.fn().mockResolvedValue(null) } as never);

    const response = await request(createAuthApp())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe(AUTH_ERROR.UNAUTHORIZED.code);
  });

  it('does not misclassify a user lookup database failure as token invalid', async () => {
    const token = jwt.sign({ id: USER_ID }, ACCESS_SECRET, { expiresIn: '5m' });
    const databaseError = new mongoose.mongo.MongoServerError({
      message: 'private database details',
      code: 123,
    });
    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockRejectedValue(databaseError),
    } as never);

    const response = await request(createAuthApp())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(response.body.code).toBe('COMMON_0008');
    expect(JSON.stringify(response.body)).not.toContain('private database');
  });

  it('returns forbidden when the authenticated role is not allowed', async () => {
    const response = await request(createAuthApp()).get('/admin');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe(AUTH_ERROR.FORBIDDEN.code);
  });
});

describe('refresh-token service', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = ACCESS_SECRET;
    process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('distinguishes a missing refresh token', async () => {
    await expect(authService.refreshToken()).rejects.toMatchObject({
      code: AUTH_ERROR.REFRESH_TOKEN_MISSING.code,
    });
  });

  it('distinguishes an invalid refresh token', async () => {
    await expect(authService.refreshToken('invalid')).rejects.toMatchObject({
      code: AUTH_ERROR.REFRESH_TOKEN_INVALID.code,
    });
  });

  it('distinguishes an expired refresh token', async () => {
    const token = jwt.sign({ id: USER_ID }, REFRESH_SECRET, { expiresIn: -1 });

    await expect(authService.refreshToken(token)).rejects.toMatchObject({
      code: AUTH_ERROR.REFRESH_TOKEN_EXPIRED.code,
    });
  });

  it('rejects a revoked refresh token', async () => {
    const token = jwt.sign({ id: USER_ID }, REFRESH_SECRET, { expiresIn: '5m' });
    vi.spyOn(invalidatedTokenRepository, 'findByToken').mockResolvedValue(
      {} as IInvalidatedTokenDocument
    );

    await expect(authService.refreshToken(token)).rejects.toMatchObject({
      code: AUTH_ERROR.REFRESH_TOKEN_REVOKED.code,
    });
  });

  it('does not swallow a database error while checking revocation', async () => {
    const token = jwt.sign({ id: USER_ID }, REFRESH_SECRET, { expiresIn: '5m' });
    const databaseError = new Error('database unavailable');
    vi.spyOn(invalidatedTokenRepository, 'findByToken').mockRejectedValue(databaseError);

    await expect(authService.refreshToken(token)).rejects.toBe(databaseError);
  });

  it('rejects a refresh token whose user no longer exists', async () => {
    const token = jwt.sign({ id: USER_ID }, REFRESH_SECRET, { expiresIn: '5m' });
    vi.spyOn(invalidatedTokenRepository, 'findByToken').mockResolvedValue(null);
    vi.spyOn(userRepository, 'findById').mockResolvedValue(null);

    await expect(authService.refreshToken(token)).rejects.toMatchObject({
      code: AUTH_ERROR.UNAUTHORIZED.code,
    });
  });

  it('keeps blacklist insertion idempotent only for duplicate-key errors', async () => {
    const token = jwt.sign({ id: USER_ID }, REFRESH_SECRET, { expiresIn: '5m' });
    vi.spyOn(invalidatedTokenRepository, 'findByToken').mockResolvedValue(null);
    vi.spyOn(userRepository, 'findById').mockResolvedValue({} as IUserDocument);
    vi.spyOn(invalidatedTokenRepository, 'create').mockRejectedValue({ code: 11000 });

    await expect(authService.refreshToken(token)).resolves.toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      token: expect.any(String),
    });
  });

  it('does not swallow other blacklist database errors', async () => {
    const databaseError = new Error('database unavailable');
    vi.spyOn(invalidatedTokenRepository, 'create').mockRejectedValue(databaseError);

    await expect(authService.logout('opaque-refresh-token')).rejects.toBe(databaseError);
  });

  it('uses AppError instances for refresh failures', async () => {
    await expect(authService.refreshToken('invalid')).rejects.toBeInstanceOf(AppError);
  });
});
