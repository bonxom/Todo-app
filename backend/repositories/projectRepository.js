import Project from '../models/Project.js';

export const projectRepository = {
  findById(id) {
    return Project.findById(id);
  },

  findByIdPopulated(id) {
    return Project.findById(id).populate('userId', 'name email');
  },

  findByUser(userId) {
    return Project.find({ userId });
  },

  findByUserPopulated(userId) {
    return Project.find({ userId }).populate('userId', 'name email').sort({ createdAt: -1 });
  },

  findAllPopulated() {
    return Project.find().populate('userId', 'name email').sort({ createdAt: -1 });
  },

  findByUserAndName(userId, name) {
    return Project.findOne({ userId, name });
  },

  create(data) {
    return Project.create(data);
  },

  updateById(id, update) {
    return Project.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  updateByIdPopulated(id, update) {
    return Project.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).populate('userId', 'name email');
  },

  deleteById(id) {
    return Project.findOneAndDelete({ _id: id });
  },
};
