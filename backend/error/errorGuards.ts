import mongoose from 'mongoose';
import type { ErrorDefinition } from './ErrorDefinition.js';
import { AppError } from './AppError.js';
import { COMMON_ERROR } from './definitions/commonErrors.js';

interface ErrorWithCode {
  readonly code?: unknown;
}

interface SyntaxErrorWithStatus {
  readonly status?: unknown;
  readonly type?: unknown;
}

export const hasErrorCode = (error: unknown, code: number | string): boolean =>
  typeof error === 'object' && error !== null &&
  'code' in error && (error as ErrorWithCode).code === code;

export const isMalformedJsonError = (error: unknown): boolean => {
  if (!(error instanceof SyntaxError) || typeof error !== 'object' || error === null) return false;
  const candidate = error as SyntaxErrorWithStatus;
  return candidate.status === 400 && candidate.type === 'entity.parse.failed';
};

export const isMongooseError = (error: unknown): boolean =>
  error instanceof mongoose.Error;

export const mapDatabaseError = (
  error: unknown,
  duplicateDefinition?: ErrorDefinition
): AppError => {
  if (hasErrorCode(error, 11000)) {
    return new AppError(duplicateDefinition ?? COMMON_ERROR.DUPLICATE_RESOURCE, { cause: error });
  }
  return new AppError(COMMON_ERROR.DATABASE_ERROR, { cause: error });
};
