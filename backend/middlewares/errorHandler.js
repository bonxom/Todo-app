import { AppError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error('Unhandled error:', err);

  if (req.path.startsWith('/api/') || req.path === '/healthz') {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }

  res.status(500).send('Internal server error');
};
