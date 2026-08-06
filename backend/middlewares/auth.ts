import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { IUserDocument } from '../types/IUser.js';

interface JwtPayload {
  id: string;
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      req.user = (await User.findById(decoded.id).select('-password')) as IUserDocument;

      if (!req.user) {
        res.status(401).json({ message: 'Not authorized, user not found' });
        return;
      }

      next();
      return;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in auth middleware:', message);
      res.status(401).json({ message: 'Not authorized, token failed' });
      return;
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Cannot find the token' });
    return;
  }
};

export const authorize = (...roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { role } = req.user;

    if (!roles.includes(role)) {
      res
        .status(403)
        .json({ message: `User role '${role}' is not authorized to access this route` });
      return;
    }
    next();
  };
};
