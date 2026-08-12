import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const requestContext = (req: Request, _res: Response, next: NextFunction): void => {
  req.requestId = randomUUID();
  next();
};
