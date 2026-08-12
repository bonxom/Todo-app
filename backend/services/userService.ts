import mongoose from 'mongoose';
import { userRepository } from '../repositories/userRepository.js';
import { AppError } from '../error/AppError.js';
import { USER_ERROR } from '../error/definitions/userErrors.js';
import { mapDatabaseError } from '../error/errorGuards.js';
import { IUserDocument } from '../types/IUser.js';
import { UpdateUserInput } from '../validations/userValidation.js';

export const userService = {
  async create(data: Record<string, unknown>): Promise<IUserDocument> {
    try {
      return await userRepository.create(data);
    } catch (error: unknown) {
      throw mapDatabaseError(error, USER_ERROR.EMAIL_EXISTED);
    }
  },

  async getAll(): Promise<IUserDocument[]> {
    return userRepository.findAll();
  },

  async getById(id: mongoose.Types.ObjectId | string): Promise<IUserDocument> {
    const user = await userRepository.findByIdPopulated(id);
    if (!user) throw new AppError(USER_ERROR.NOT_FOUND);
    return user;
  },

  async update(
    id: mongoose.Types.ObjectId | string,
    data: UpdateUserInput
  ): Promise<IUserDocument> {
    if (Object.keys(data).length === 0) {
      throw new AppError(USER_ERROR.NO_FIELDS_TO_UPDATE);
    }

    let user: IUserDocument | null;
    try {
      user = await userRepository.updateById(id, data as Record<string, unknown>);
    } catch (error: unknown) {
      throw mapDatabaseError(error, USER_ERROR.EMAIL_EXISTED);
    }
    if (!user) throw new AppError(USER_ERROR.NOT_FOUND);
    return user;
  },

  async delete(id: mongoose.Types.ObjectId | string): Promise<void> {
    const user = await userRepository.deleteById(id);
    if (!user) throw new AppError(USER_ERROR.NOT_FOUND);
  },
};
