import type { NextFunction, Request, Response } from 'express';
import type { ZodIssue, ZodType } from 'zod';
import { AppError } from '../error/AppError.js';
import { COMMON_ERROR } from '../error/definitions/commonErrors.js';

interface ValidationSchemas {
  readonly body?: ZodType;
  readonly params?: ZodType;
  readonly query?: ZodType;
}

interface ValidationDetail {
  readonly fieldName: string;
  readonly message: string;
}

interface CustomIssueParams {
  readonly errorCode?: unknown;
  readonly fieldName?: unknown;
}

const normalizeIssues = (issues: readonly ZodIssue[]): ValidationDetail[] =>
  issues.map((issue) => ({ fieldName: issue.path.join('.'), message: issue.message }));

const getCustomParams = (issue: ZodIssue): CustomIssueParams | undefined => {
  if (!('params' in issue) || typeof issue.params !== 'object' || issue.params === null) {
    return undefined;
  }
  return issue.params as CustomIssueParams;
};

const parse = (schema: ZodType, value: unknown): Record<string, unknown> => {
  const result = schema.safeParse(value);
  if (result.success) return result.data as Record<string, unknown>;

  const objectIdIssue = result.error.issues.find(
    (issue) => getCustomParams(issue)?.errorCode === COMMON_ERROR.INVALID_OBJECT_ID.code
  );
  if (objectIdIssue) {
    const field = getCustomParams(objectIdIssue)?.fieldName;
    throw new AppError(COMMON_ERROR.INVALID_OBJECT_ID, {
      params: { field: typeof field === 'string' ? field : objectIdIssue.path.join('.') },
    });
  }

  throw new AppError(COMMON_ERROR.INVALID_PAYLOAD, {
    details: normalizeIssues(result.error.issues),
  });
};

export const validate = (schemas: ValidationSchemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) req.validatedBody = parse(schemas.body, req.body);
    if (schemas.params) {
      req.validatedParams = parse(schemas.params, req.params) as Record<string, string>;
    }
    if (schemas.query) req.validatedQuery = parse(schemas.query, req.query);
    next();
  };
