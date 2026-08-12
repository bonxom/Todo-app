import type { NextFunction, Request, Response } from 'express';
import { AppError } from './AppError.js';
import { COMMON_ERROR } from './definitions/commonErrors.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(COMMON_ERROR.ROUTE_NOT_FOUND, {
    params: { method: req.method, path: req.originalUrl },
  }));
};
