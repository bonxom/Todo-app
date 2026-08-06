import User from '../models/User.js';

export const userRepository = {
  findById(id) {
    return User.findById(id);
  },

  findByIdWithPassword(id) {
    return User.findById(id).select('+password');
  },

  findByIdPopulated(id) {
    return User.findById(id).populate('categories', 'name description');
  },

  findByEmail(email) {
    return User.findOne({ email });
  },

  findByEmailWithPassword(email) {
    return User.findOne({ email }).select('+password');
  },

  findAll() {
    return User.find().select('-password').populate('categories', 'name description');
  },

  create(data) {
    return User.create(data);
  },

  updateById(id, update) {
    return User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).select('-password');
  },

  deleteById(id) {
    return User.findByIdAndDelete(id);
  },

  addCategory(userId, categoryId) {
    return User.findByIdAndUpdate(userId, { $push: { categories: categoryId } });
  },

  removeCategory(userId, categoryId) {
    return User.findByIdAndUpdate(userId, { $pull: { categories: categoryId } });
  },
};
