import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository.js';
import { invalidatedTokenRepository } from '../repositories/invalidatedTokenRepository.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors.js';

const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET;

const generateAccessToken = (id) => {
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN;
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

const generateRefreshToken = (userId) => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN;
  const refreshSecret = getRefreshSecret();
  return jwt.sign({ id: userId }, refreshSecret, { expiresIn });
};

const addTokenToBlacklist = async (tokenString) => {
  if (!tokenString) return;
  const decoded = jwt.decode(tokenString);
  const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  try {
    await invalidatedTokenRepository.create({ token: tokenString, expiresAt });
  } catch (error) {
    // If it's already in the blacklist (duplicate key error), we can ignore it
    if (error.code !== 11000) throw error;
  }
};

export const authService = {
  async register(data) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new ValidationError('Email already exists');

    const user = await userRepository.create({
      email: data.email,
      password: data.password,
      name: data.name,
      dob: data.dob,
      nationality: data.nationality || 'Vietnam',
      role: 'USER',
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.password = undefined;

    return { user, accessToken, refreshToken, token: accessToken };
  },

  async login(email, password) {
    const user = await userRepository.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new UnauthorizedError('Invalid email or password');

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.password = undefined;

    return { user, accessToken, refreshToken, token: accessToken };
  },

  async refreshToken(refreshTokenString) {
    if (!refreshTokenString) {
      throw new UnauthorizedError('Refresh token is required');
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshTokenString, getRefreshSecret());
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Check if token is in the blacklist
    const isBlacklisted = await invalidatedTokenRepository.findByToken(refreshTokenString);
    if (isBlacklisted) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    // Generate new access token and refresh token (Token Rotation)
    const newAccessToken = generateAccessToken(decoded.id);
    const newRefreshToken = generateRefreshToken(decoded.id);

    // Blacklist the old refresh token
    await addTokenToBlacklist(refreshTokenString);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, token: newAccessToken };
  },

  async logout(refreshTokenString) {
    if (refreshTokenString) {
      await addTokenToBlacklist(refreshTokenString);
    }
  },

  async getMe(userId) {
    const user = await userRepository.findByIdPopulated(userId);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new NotFoundError('User not found');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new UnauthorizedError('Current password is incorrect');

    const isSame = await user.comparePassword(newPassword);
    if (isSame) throw new ValidationError('New password must be different from the current password');

    user.password = newPassword;
    await user.save();
  },

  async updateInfo(userId, data) {
    const ALLOWED_FIELDS = ['email', 'name', 'dob', 'nationality', 'avatarUrl'];
    const filtered = {};
    for (const key of ALLOWED_FIELDS) {
      if (data[key] !== undefined) filtered[key] = data[key];
    }

    if (Object.keys(filtered).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const user = await userRepository.updateById(userId, filtered);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async selfDelete(userId) {
    const user = await userRepository.deleteById(userId);
    if (!user) throw new NotFoundError('User not found');
  },
};
