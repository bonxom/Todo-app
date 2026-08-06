import Category from '../models/Category.js';

export const categoryRepository = {
  findById(id) {
    return Category.findById(id);
  },

  findByIdPopulated(id) {
    return Category.findById(id).populate('userId', 'name email');
  },

  findByUser(userId) {
    return Category.find({ userId }).populate('userId', 'name email');
  },

  findAll() {
    return Category.find({}).populate('userId', 'name email');
  },

  findByUserAndName(userId, name) {
    return Category.findOne({ userId, name });
  },

  create(data) {
    return Category.create(data);
  },

  updateById(id, update) {
    return Category.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  deleteById(id) {
    return Category.findByIdAndDelete(id);
  },
};
