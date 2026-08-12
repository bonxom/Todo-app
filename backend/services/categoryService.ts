import mongoose from 'mongoose';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { AppError } from '../error/AppError.js';
import { CATEGORY_ERROR } from '../error/definitions/categoryErrors.js';
import { mapDatabaseError } from '../error/errorGuards.js';
import { ICategoryDocument } from '../types/ICategory.js';
import { IUserDocument } from '../types/IUser.js';

const verifyOwnership = (category: ICategoryDocument, user: IUserDocument): void => {
  if (user.role === 'ADMIN') return;
  if (category.userId.toString() !== user._id.toString()) {
    throw new AppError(CATEGORY_ERROR.ACCESS_DENIED);
  }
};

export const categoryService = {
  async create(
    data: Record<string, unknown>,
    userId: mongoose.Types.ObjectId | string
  ): Promise<ICategoryDocument> {
    const existing = await categoryRepository.findByUserAndName(userId, data.name as string);
    if (existing) {
      throw new AppError(CATEGORY_ERROR.NAME_EXISTED);
    }

    let category: ICategoryDocument;
    try {
      category = await categoryRepository.create({ ...data, userId });
    } catch (error: unknown) {
      throw mapDatabaseError(error, CATEGORY_ERROR.NAME_EXISTED);
    }
    await userRepository.addCategory(userId, category._id);
    return category;
  },

  async getAll(user: IUserDocument): Promise<ICategoryDocument[]> {
    if (user.role === 'ADMIN') {
      return categoryRepository.findAll();
    }
    return categoryRepository.findByUser(user._id);
  },

  async getById(
    id: mongoose.Types.ObjectId | string,
    user: IUserDocument
  ): Promise<ICategoryDocument> {
    const category = await categoryRepository.findByIdPopulated(id);
    if (!category) throw new AppError(CATEGORY_ERROR.NOT_FOUND);
    verifyOwnership(category, user);
    return category;
  },

  async update(
    id: mongoose.Types.ObjectId | string,
    data: Record<string, unknown>,
    user: IUserDocument
  ): Promise<ICategoryDocument | null> {
    const category = await categoryRepository.findById(id);
    if (!category) throw new AppError(CATEGORY_ERROR.NOT_FOUND);

    if (category.name === 'Uncategorized') {
      throw new AppError(CATEGORY_ERROR.UNCATEGORIZED_CATEGORY_IMMUTABLE);
    }

    verifyOwnership(category, user);

    if (Object.keys(data).length === 0) {
      throw new AppError(CATEGORY_ERROR.NO_FIELDS_TO_UPDATE);
    }

    try {
      const updated = await categoryRepository.updateById(id, data);
      if (!updated) throw new AppError(CATEGORY_ERROR.NOT_FOUND);
      return updated;
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw mapDatabaseError(error, CATEGORY_ERROR.NAME_EXISTED);
    }
  },

  async delete(
    id: mongoose.Types.ObjectId | string,
    user: IUserDocument
  ): Promise<void> {
    const category = await categoryRepository.findById(id);
    if (!category) throw new AppError(CATEGORY_ERROR.NOT_FOUND);

    if (category.name === 'Uncategorized') {
      throw new AppError(CATEGORY_ERROR.UNCATEGORIZED_CATEGORY_IMMUTABLE);
    }

    verifyOwnership(category, user);

    await userRepository.removeCategory(category.userId, id);
    await categoryRepository.deleteById(id);
  },
};
