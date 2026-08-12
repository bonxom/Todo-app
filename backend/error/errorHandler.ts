import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import multer from 'multer';
import OpenAI from 'openai';
import { ZodError } from 'zod';
import { AppError } from './AppError.js';
import { COMMON_ERROR } from './definitions/commonErrors.js';
import { AUTH_ERROR } from './definitions/authErrors.js';
import { AI_ERROR } from './definitions/aiErrors.js';
import { hasErrorCode, isMalformedJsonError } from './errorGuards.js';

export interface ValidationIssueDetail {
  readonly fieldName: string;
  readonly message: string;
}

const normalizeZodIssues = (error: ZodError): ValidationIssueDetail[] =>
  error.issues.map((issue) => ({ fieldName: issue.path.join('.'), message: issue.message }));

const normalizeMongooseIssues = (error: mongoose.Error.ValidationError): ValidationIssueDetail[] =>
  Object.values(error.errors).map((issue) => ({ fieldName: issue.path, message: issue.message }));

const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) {
    return new AppError(COMMON_ERROR.INVALID_PAYLOAD, { details: normalizeZodIssues(error), cause: error });
  }
  if (error instanceof mongoose.Error.ValidationError) {
    return new AppError(COMMON_ERROR.INVALID_PAYLOAD, { details: normalizeMongooseIssues(error), cause: error });
  }
  if (error instanceof mongoose.Error.CastError) {
    return new AppError(COMMON_ERROR.INVALID_OBJECT_ID, { params: { field: error.path }, cause: error });
  }
  if (hasErrorCode(error, 11000)) return new AppError(COMMON_ERROR.DUPLICATE_RESOURCE, { cause: error });
  if (error instanceof jwt.TokenExpiredError) return new AppError(AUTH_ERROR.TOKEN_EXPIRED, { cause: error });
  if (error instanceof jwt.JsonWebTokenError) return new AppError(AUTH_ERROR.TOKEN_INVALID, { cause: error });
  if (isMalformedJsonError(error)) return new AppError(COMMON_ERROR.INVALID_JSON, { cause: error });
  if (error instanceof multer.MulterError) return new AppError(COMMON_ERROR.INVALID_PAYLOAD, { cause: error });
  if (error instanceof OpenAI.APIConnectionTimeoutError) return new AppError(AI_ERROR.PROVIDER_TIMEOUT, { cause: error });
  if (error instanceof OpenAI.APIError) return new AppError(AI_ERROR.PROVIDER_ERROR, { cause: error });
  if (error instanceof mongoose.mongo.MongoError) return new AppError(COMMON_ERROR.DATABASE_ERROR, { cause: error });
  if (error instanceof mongoose.Error) return new AppError(COMMON_ERROR.DATABASE_ERROR, { cause: error });
  return new AppError(COMMON_ERROR.UNCATEGORIZED_EXCEPTION, { cause: error });
};

const isValidationDetails = (details: unknown): details is ValidationIssueDetail[] =>
  Array.isArray(details) && details.every((detail) =>
    typeof detail === 'object' && detail !== null &&
    'fieldName' in detail && typeof detail.fieldName === 'string' &&
    'message' in detail && typeof detail.message === 'string'
  );

const summarizeCause = (cause: unknown): unknown => {
  if (!(cause instanceof Error)) return { type: typeof cause };
  if (cause instanceof ZodError) {
    return { name: cause.name, issueCount: cause.issues.length };
  }
  if (cause instanceof mongoose.Error.ValidationError) {
    return { name: cause.name, fields: Object.keys(cause.errors) };
  }
  if (cause instanceof OpenAI.APIError) {
    return { name: cause.name, status: cause.status, code: cause.code };
  }
  return { name: cause.name, message: cause.message, stack: cause.stack };
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const error = toAppError(err);
  if (error.statusCode >= 500 || error.cause !== undefined) {
    console.error({
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      error: { name: error.name, code: error.code, statusCode: error.statusCode, stack: error.stack },
      cause: summarizeCause(error.cause),
    });
  }

  res.status(error.statusCode).json({
    code: error.code,
    message: error.message,
    ...(isValidationDetails(error.details) ? { details: error.details } : {}),
  });
};
