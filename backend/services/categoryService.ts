import mongoose from 'mongoose';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { ICategoryDocument } from '../types/ICategory.js';
import { IUserDocument } from '../types/IUser.js';

const verifyOwnership = (category: ICategoryDocument, user: IUserDocument): void => {
  if (user.role === 'ADMIN') return;
  if (category.userId.toString() !== user._id.toString()) {
    throw new ForbiddenError("You don't have permission to access this category");
  }
};

export const categoryService = {
  async create(
    data: Record<string, unknown>,
    userId: mongoose.Types.ObjectId | string
  ): Promise<ICategoryDocument> {
    const existing = await categoryRepository.findByUserAndName(userId, data.name as string);
    if (existing) {
      throw new ValidationError('Category name already exists for this user');
    }

    const category = await categoryRepository.create({ ...data, userId });
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
    if (!category) throw new NotFoundError('Category not found');
    verifyOwnership(category, user);
    return category;
  },

  async update(
    id: mongoose.Types.ObjectId | string,
    data: Record<string, unknown>,
    user: IUserDocument
  ): Promise<ICategoryDocument | null> {
    const category = await categoryRepository.findById(id);
    if (!category) throw new NotFoundError('Category not found');

    if (category.name === 'Uncategorized') {
      throw new ValidationError("Cannot update the 'Uncategorized' category");
    }

    verifyOwnership(category, user);

    if (Object.keys(data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    return categoryRepository.updateById(id, data);
  },

  async delete(
    id: mongoose.Types.ObjectId | string,
    user: IUserDocument
  ): Promise<void> {
    const category = await categoryRepository.findById(id);
    if (!category) throw new NotFoundError('Category not found');

    if (category.name === 'Uncategorized') {
      throw new ValidationError("Cannot delete the 'Uncategorized' category");
    }

    verifyOwnership(category, user);

    await userRepository.removeCategory(category.userId, id);
    await categoryRepository.deleteById(id);
  },
};
