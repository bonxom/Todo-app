import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
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

    const token = generateToken(user._id);
    user.password = undefined;

    return { user, token };
  },

  async login(email, password) {
    const user = await userRepository.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new UnauthorizedError('Invalid email or password');

    const token = generateToken(user._id);
    user.password = undefined;

    return { user, token };
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
    if (Object.keys(data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const user = await userRepository.updateById(userId, data);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async selfDelete(userId) {
    const user = await userRepository.deleteById(userId);
    if (!user) throw new NotFoundError('User not found');
  },
};
