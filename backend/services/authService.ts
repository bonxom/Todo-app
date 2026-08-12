import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { userRepository } from '../repositories/userRepository.js';
import { invalidatedTokenRepository } from '../repositories/invalidatedTokenRepository.js';
import { AppError } from '../error/AppError.js';
import { AUTH_ERROR } from '../error/definitions/authErrors.js';
import { USER_ERROR } from '../error/definitions/userErrors.js';
import { mapDatabaseError } from '../error/errorGuards.js';
import { IUserDocument } from '../types/IUser.js';

interface JwtPayload {
  id: string;
  exp?: number;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  token: string; // backward compat alias for accessToken
}

const getRefreshSecret = (): string => process.env.JWT_REFRESH_SECRET!;

const generateAccessToken = (id: mongoose.Types.ObjectId | string): string => {
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'];
  return jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn });
};

const generateRefreshToken = (userId: mongoose.Types.ObjectId | string): string => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'];
  return jwt.sign({ id: userId }, getRefreshSecret(), { expiresIn });
};

const addTokenToBlacklist = async (tokenString: string): Promise<void> => {
  if (!tokenString) return;
  const decoded = jwt.decode(tokenString) as JwtPayload | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  try {
    await invalidatedTokenRepository.create({ token: tokenString, expiresAt });
  } catch (error: unknown) {
    // Blacklisting is idempotent: only an existing token duplicate-key error is safe to ignore.
    if ((error as { code?: number }).code !== 11000) throw error;
  }
};

export const authService = {
  async register(
    data: Record<string, unknown>
  ): Promise<{ user: IUserDocument } & AuthTokens> {
    const existing = await userRepository.findByEmail(data.email as string);
    if (existing) throw new AppError(USER_ERROR.EMAIL_EXISTED);

    let user: IUserDocument;
    try {
      user = await userRepository.create({
        email: data.email,
        password: data.password,
        name: data.name,
        dob: data.dob,
        nationality: data.nationality || 'Vietnam',
        role: 'USER',
      });
    } catch (error: unknown) {
      throw mapDatabaseError(error, USER_ERROR.EMAIL_EXISTED);
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return { user, accessToken, refreshToken, token: accessToken };
  },

  async login(
    email: string,
    password: string
  ): Promise<{ user: IUserDocument } & AuthTokens> {
    const user = await userRepository.findByEmailWithPassword(email);
    if (!user) throw new AppError(AUTH_ERROR.INVALID_CREDENTIALS);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AppError(AUTH_ERROR.INVALID_CREDENTIALS);

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return { user, accessToken, refreshToken, token: accessToken };
  },

  async refreshToken(refreshTokenString?: string): Promise<AuthTokens> {
    if (!refreshTokenString) {
      throw new AppError(AUTH_ERROR.REFRESH_TOKEN_MISSING);
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(refreshTokenString, getRefreshSecret()) as JwtPayload;
    } catch (error: unknown) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(AUTH_ERROR.REFRESH_TOKEN_EXPIRED, { cause: error });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError(AUTH_ERROR.REFRESH_TOKEN_INVALID, { cause: error });
      }
      throw error;
    }

    if (!decoded || typeof decoded.id !== 'string' || !mongoose.isObjectIdOrHexString(decoded.id)) {
      throw new AppError(AUTH_ERROR.REFRESH_TOKEN_INVALID);
    }

    // Check if token is in the blacklist
    const isBlacklisted = await invalidatedTokenRepository.findByToken(refreshTokenString);
    if (isBlacklisted) {
      throw new AppError(AUTH_ERROR.REFRESH_TOKEN_REVOKED);
    }

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      throw new AppError(AUTH_ERROR.UNAUTHORIZED);
    }

    // Generate new tokens (Token Rotation)
    const newAccessToken = generateAccessToken(decoded.id);
    const newRefreshToken = generateRefreshToken(decoded.id);

    // Blacklist the old refresh token
    await addTokenToBlacklist(refreshTokenString);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, token: newAccessToken };
  },

  async logout(refreshTokenString?: string): Promise<void> {
    if (refreshTokenString) {
      await addTokenToBlacklist(refreshTokenString);
    }
  },

  async getMe(userId: mongoose.Types.ObjectId | string): Promise<IUserDocument> {
    const user = await userRepository.findByIdPopulated(userId);
    if (!user) throw new AppError(USER_ERROR.NOT_FOUND);
    return user;
  },

  async changePassword(
    userId: mongoose.Types.ObjectId | string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new AppError(USER_ERROR.NOT_FOUND);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new AppError(USER_ERROR.CURRENT_PASSWORD_INCORRECT);

    const isSame = await user.comparePassword(newPassword);
    if (isSame) throw new AppError(USER_ERROR.NEW_PASSWORD_SAME_AS_CURRENT);

    user.password = newPassword;
    await user.save();
  },

  async updateInfo(
    userId: mongoose.Types.ObjectId | string,
    data: Record<string, unknown>
  ): Promise<IUserDocument> {
    const ALLOWED_FIELDS = ['email', 'name', 'dob', 'nationality', 'avatarUrl'];
    const filtered: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (data[key] !== undefined) filtered[key] = data[key];
    }

    if (Object.keys(filtered).length === 0) {
      throw new AppError(USER_ERROR.NO_FIELDS_TO_UPDATE);
    }

    let user: IUserDocument | null;
    try {
      user = await userRepository.updateById(userId, filtered);
    } catch (error: unknown) {
      throw mapDatabaseError(error, USER_ERROR.EMAIL_EXISTED);
    }
    if (!user) throw new AppError(USER_ERROR.NOT_FOUND);
    return user;
  },

  async selfDelete(userId: mongoose.Types.ObjectId | string): Promise<void> {
    const user = await userRepository.deleteById(userId);
    if (!user) throw new AppError(USER_ERROR.NOT_FOUND);
  },
};
