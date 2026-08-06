import { userRepository } from '../repositories/userRepository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export const userService = {
  async create(data) {
    return userRepository.create(data);
  },

  async getAll() {
    return userRepository.findAll();
  },

  async getById(id) {
    const user = await userRepository.findByIdPopulated(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async update(id, data) {
    if (Object.keys(data).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const user = await userRepository.updateById(id, data);
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async delete(id) {
    const user = await userRepository.deleteById(id);
    if (!user) throw new NotFoundError('User not found');
  },
};
