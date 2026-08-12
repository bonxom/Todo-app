import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import multer from 'multer';
import OpenAI from 'openai';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema } from '../../validations/commonValidation.js';
import { AppError } from '../AppError.js';
import { AUTH_ERROR } from '../definitions/authErrors.js';
import { COMMON_ERROR } from '../definitions/commonErrors.js';
import { errorHandler } from '../errorHandler.js';
import { notFoundHandler } from '../notFoundHandler.js';
import { requestContext } from '../requestContext.js';

const createTestApp = (): express.Express => {
  const app = express();
  app.use(requestContext);
  app.use(express.json());

  app.post(
    '/validated/:id',
    validate({
      body: z.object({ password: z.string().min(8), name: z.string().min(1) }),
      params: idParamSchema,
      query: z.object({ page: z.coerce.number().int().positive() }),
    }),
    (req, res) => {
      res.json({
        body: req.validatedBody,
        params: req.validatedParams,
        query: req.validatedQuery,
      });
    }
  );

  app.get('/app-error', () => {
    throw new AppError(COMMON_ERROR.INVALID_PAYLOAD, {
      cause: new Error('private root cause'),
    });
  });
  app.get('/zod', () => {
    z.object({ email: z.string().email() }).parse({ email: 'invalid' });
  });
  app.get('/mongoose-validation', () => {
    const error = new mongoose.Error.ValidationError();
    error.addError('name', new mongoose.Error.ValidatorError({
      path: 'name',
      message: 'Name is required',
    }));
    throw error;
  });
  app.get('/cast', () => {
    throw new mongoose.Error.CastError('ObjectId', 'not-an-id', 'projectId');
  });
  app.get('/duplicate', () => {
    throw { code: 11000, keyValue: { email: 'private@example.com' } };
  });
  app.get('/jwt-expired', () => {
    throw new jwt.TokenExpiredError('expired', new Date());
  });
  app.get('/jwt-invalid', () => {
    throw new jwt.JsonWebTokenError('invalid signature');
  });
  app.get('/multer', () => {
    throw new multer.MulterError('LIMIT_FILE_SIZE');
  });
  app.get('/ai-timeout', () => {
    throw new OpenAI.APIConnectionTimeoutError();
  });
  app.get('/ai-provider', () => {
    throw OpenAI.APIError.generate(500, {}, 'provider details', new Headers());
  });
  app.get('/database', () => {
    throw new mongoose.mongo.MongoServerError({ message: 'private mongo details', code: 123 });
  });
  app.get('/unknown', () => {
    throw new Error('private database or implementation message');
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

describe('validation middleware and global error handler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores parsed body, params and query data', async () => {
    const response = await request(createTestApp())
      .post('/validated/507f1f77bcf86cd799439011?page=2')
      .send({ password: 'safe-password', name: 'Ada' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      body: { password: 'safe-password', name: 'Ada' },
      params: { id: '507f1f77bcf86cd799439011' },
      query: { page: 2 },
    });
  });

  it('returns normalized validation details without the rejected field value', async () => {
    const secret = 'pw';
    const response = await request(createTestApp())
      .post('/validated/507f1f77bcf86cd799439011?page=2')
      .send({ password: secret, name: '' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(COMMON_ERROR.INVALID_PAYLOAD.code);
    expect(response.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldName: 'password', message: expect.any(String) }),
      expect.objectContaining({ fieldName: 'name', message: expect.any(String) }),
    ]));
    expect(JSON.stringify(response.body)).not.toContain(secret);
  });

  it('returns INVALID_OBJECT_ID at the request boundary', async () => {
    const response = await request(createTestApp())
      .post('/validated/not-an-object-id?page=2')
      .send({ password: 'safe-password', name: 'Ada' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: COMMON_ERROR.INVALID_OBJECT_ID.code,
      message: 'Invalid object ID for id',
    });
  });

  it('maps malformed JSON without returning the submitted content', async () => {
    const response = await request(createTestApp())
      .post('/validated/507f1f77bcf86cd799439011?page=2')
      .set('Content-Type', 'application/json')
      .send('{"password":"secret",');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: COMMON_ERROR.INVALID_JSON.code,
      message: COMMON_ERROR.INVALID_JSON.message,
    });
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it.each([
    ['/zod', 400, COMMON_ERROR.INVALID_PAYLOAD.code],
    ['/mongoose-validation', 400, COMMON_ERROR.INVALID_PAYLOAD.code],
    ['/cast', 400, COMMON_ERROR.INVALID_OBJECT_ID.code],
    ['/duplicate', 409, COMMON_ERROR.DUPLICATE_RESOURCE.code],
    ['/jwt-expired', 401, AUTH_ERROR.TOKEN_EXPIRED.code],
    ['/jwt-invalid', 401, AUTH_ERROR.TOKEN_INVALID.code],
    ['/multer', 400, COMMON_ERROR.INVALID_PAYLOAD.code],
    ['/ai-timeout', 504, 'AI_0003'],
    ['/ai-provider', 502, 'AI_0002'],
    ['/database', 500, COMMON_ERROR.DATABASE_ERROR.code],
  ])('maps %s safely', async (path, status, code) => {
    const response = await request(createTestApp()).get(path);

    expect(response.status).toBe(status);
    expect(response.body.code).toBe(code);
    expect(response.body).not.toHaveProperty('cause');
    expect(response.body).not.toHaveProperty('stack');
    expect(response.body).not.toHaveProperty('timestamp');
    expect(response.body).not.toHaveProperty('requestId');
  });

  it('does not expose AppError cause', async () => {
    const response = await request(createTestApp()).get('/app-error');

    expect(response.body).toEqual({
      code: COMMON_ERROR.INVALID_PAYLOAD.code,
      message: COMMON_ERROR.INVALID_PAYLOAD.message,
    });
    expect(JSON.stringify(response.body)).not.toContain('private root cause');
  });

  it('does not expose an unknown error message', async () => {
    const response = await request(createTestApp()).get('/unknown');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: COMMON_ERROR.UNCATEGORIZED_EXCEPTION.code,
      message: COMMON_ERROR.UNCATEGORIZED_EXCEPTION.message,
    });
    expect(JSON.stringify(response.body)).not.toContain('private database');
    expect(response.headers).not.toHaveProperty('x-request-id');
    expect(console.error).toHaveBeenCalledWith(expect.objectContaining({
      requestId: expect.any(String),
      method: 'GET',
      path: '/unknown',
    }));
  });

  it('maps an unknown route through the not-found handler', async () => {
    const response = await request(createTestApp()).get('/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: COMMON_ERROR.ROUTE_NOT_FOUND.code,
      message: 'Route GET /missing not found',
    });
  });

  it('passes the original error onward when headers were already sent', () => {
    const original = new Error('stream failed');
    const next = vi.fn();
    const req = { requestId: 'internal-id', method: 'GET', originalUrl: '/stream' } as Request;
    const res = { headersSent: true } as Response;

    errorHandler(original, req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(original);
  });
});
