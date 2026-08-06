import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { userRepository } from '../repositories/userRepository.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { IUserDocument } from '../types/IUser.js';

interface JwtPayload {
  id: string;
}

const generateToken = (id: mongoose.Types.ObjectId | string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const authService = {
  async register(data: Record<string, unknown>): Promise<{ user: IUserDocument; token: string }> {
    const existing = await userRepository.findByEmail(data.email as string);
    if (existing) throw new ValidationError('Email already exists');

    const user = await userRepository.create({
      email: data.email,
      password: data.password,
      name: data.name,
      dob: data.dob,
      nationality: data.nationality || 'Vietnam',
      role: 'USER',
    });

    const token = generateToken(user._id);

    return { user, token };
  },

  async login(email: string, password: string): Promise<{ user: IUserDocument; token: string }> {
    const user = await userRepository.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new UnauthorizedError('Invalid email or password');

    const token = generateToken(user._id);

    return { user, token };
  },

  async getMe(userId: mongoose.Types.ObjectId | string): Promise<IUserDocument> {
    const user = await userRepository.findByIdPopulated(userId);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async changePassword(
    userId: mongoose.Types.ObjectId | string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new NotFoundError('User not found');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new UnauthorizedError('Current password is incorrect');

    const isSame = await user.comparePassword(newPassword);
    if (isSame) throw new ValidationError('New password must be different from the current password');

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
      throw new ValidationError('No fields to update');
    }

    const user = await userRepository.updateById(userId, filtered);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async selfDelete(userId: mongoose.Types.ObjectId | string): Promise<void> {
    const user = await userRepository.deleteById(userId);
    if (!user) throw new NotFoundError('User not found');
  },
};
