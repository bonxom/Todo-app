import mongoose from 'mongoose';
import { userRepository } from '../repositories/userRepository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { IUserDocument } from '../types/IUser.js';
import { UpdateUserInput } from '../validations/userValidation.js';

export const userService = {
  async create(data: Record<string, unknown>): Promise<IUserDocument> {
    return userRepository.create(data);
  },

  async getAll(): Promise<IUserDocument[]> {
    return userRepository.findAll();
  },

  async getById(id: mongoose.Types.ObjectId | string): Promise<IUserDocument> {
    const user = await userRepository.findByIdPopulated(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async update(
    id: mongoose.Types.ObjectId | string,
    data: UpdateUserInput
  ): Promise<IUserDocument> {
    if (Object.keys(data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const user = await userRepository.updateById(id, data as Record<string, unknown>);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async delete(id: mongoose.Types.ObjectId | string): Promise<void> {
    const user = await userRepository.deleteById(id);
    if (!user) throw new NotFoundError('User not found');
  },
};
