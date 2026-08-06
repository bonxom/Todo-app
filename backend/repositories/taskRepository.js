import Task from '../models/Task.js';

const TASK_POPULATE = [
  {
    path: 'categoryId',
    select: 'name userId',
    populate: { path: 'userId', select: 'name email' },
  },
  {
    path: 'projectId',
    select: 'name description color status userId',
    populate: { path: 'userId', select: 'name email' },
  },
];

export const taskRepository = {
  findById(id) {
    return Task.findById(id);
  },

  findByIdPopulated(id) {
    return Task.findById(id).populate(TASK_POPULATE);
  },

  find(query = {}, options = {}) {
    return Task.find(query).sort(options.sort || { dueDate: 1, createdAt: -1 });
  },

  findPopulated(query = {}, options = {}) {
    return Task.find(query)
      .sort(options.sort || { dueDate: 1, createdAt: -1 })
      .populate(TASK_POPULATE);
  },

  create(data) {
    return Task.create(data);
  },

  updateById(id, update) {
    return Task.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  updateByIdPopulated(id, update) {
    return Task.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
      .populate(TASK_POPULATE);
  },

  deleteById(id) {
    return Task.findByIdAndDelete(id);
  },

  aggregate(pipeline) {
    return Task.aggregate(pipeline);
  },
};
