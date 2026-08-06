import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  console.error('Unhandled error:', err);

  if (req.path.startsWith('/api/') || req.path === '/healthz') {
    res.status(500).json({ message: err.message || 'Internal server error' });
    return;
  }

  res.status(500).send('Internal server error');
};
