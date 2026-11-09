import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const requestContext = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.locals.requestStartedAt = new Date();
  req.requestId = randomUUID();
  next();
};
