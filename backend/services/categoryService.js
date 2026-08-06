import { categoryRepository } from '../repositories/categoryRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';

const verifyOwnership = (category, user) => {
  if (user.role === 'ADMIN') return;
  if (category.userId.toString() !== user._id.toString()) {
    throw new ForbiddenError("You don't have permission to access this category");
  }
};

export const categoryService = {
  async create(data, userId) {
    const existing = await categoryRepository.findByUserAndName(userId, data.name);
    if (existing) {
      throw new ValidationError('Category name already exists for this user');
    }

    const category = await categoryRepository.create({ ...data, userId });
    await userRepository.addCategory(userId, category._id);
    return category;
  },

  async getAll(user) {
    if (user.role === 'ADMIN') {
      return categoryRepository.findAll();
    }
    return categoryRepository.findByUser(user._id);
  },

  async getById(id, user) {
    const category = await categoryRepository.findByIdPopulated(id);
    if (!category) throw new NotFoundError('Category not found');
    verifyOwnership(category, user);
    return category;
  },

  async update(id, data, user) {
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

  async delete(id, user) {
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
