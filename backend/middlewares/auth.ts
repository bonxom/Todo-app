import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { AppError } from '../error/AppError.js';
import { AUTH_ERROR } from '../error/definitions/authErrors.js';

interface JwtPayload {
  id: string;
}

export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    throw new AppError(AUTH_ERROR.TOKEN_MISSING);
  }

  const bearerMatch = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!bearerMatch) {
    throw new AppError(AUTH_ERROR.TOKEN_INVALID);
  }

  const token = bearerMatch[1];
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(AUTH_ERROR.TOKEN_EXPIRED, { cause: error });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError(AUTH_ERROR.TOKEN_INVALID, { cause: error });
    }
    throw error;
  }

  if (!decoded || typeof decoded.id !== 'string' || !mongoose.isObjectIdOrHexString(decoded.id)) {
    throw new AppError(AUTH_ERROR.TOKEN_INVALID);
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    throw new AppError(AUTH_ERROR.UNAUTHORIZED);
  }

  req.user = user;
  next();
};

export const authorize = (...roles: string[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(AUTH_ERROR.UNAUTHORIZED);
    }

    const { role } = req.user;

    if (!roles.includes(role)) {
      throw new AppError(AUTH_ERROR.FORBIDDEN);
    }
    next();
  };
};
