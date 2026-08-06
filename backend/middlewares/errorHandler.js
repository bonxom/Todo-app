import { AppError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
};
