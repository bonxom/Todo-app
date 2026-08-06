import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { ITaskDocument } from '../types/ITask.js';

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
  findById(id: mongoose.Types.ObjectId | string): Promise<ITaskDocument | null> {
    return Task.findById(id);
  },

  findByIdPopulated(id: mongoose.Types.ObjectId | string): Promise<ITaskDocument | null> {
    return Task.findById(id).populate(TASK_POPULATE);
  },

  find(
    query: Record<string, unknown> = {},
    options: { sort?: Record<string, 1 | -1> } = {}
  ): Promise<ITaskDocument[]> {
    return Task.find(query).sort(options.sort || { dueDate: 1, createdAt: -1 });
  },

  findPopulated(
    query: Record<string, unknown> = {},
    options: { sort?: Record<string, 1 | -1> } = {}
  ): Promise<ITaskDocument[]> {
    return Task.find(query)
      .sort(options.sort || { dueDate: 1, createdAt: -1 })
      .populate(TASK_POPULATE);
  },

  create(data: Record<string, unknown>): Promise<ITaskDocument> {
    return Task.create(data);
  },

  updateById(
    id: mongoose.Types.ObjectId | string,
    update: Record<string, unknown>
  ): Promise<ITaskDocument | null> {
    return Task.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  updateByIdPopulated(
    id: mongoose.Types.ObjectId | string,
    update: Record<string, unknown>
  ): Promise<ITaskDocument | null> {
    return Task.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).populate(
      TASK_POPULATE
    );
  },

  deleteById(id: mongoose.Types.ObjectId | string): Promise<ITaskDocument | null> {
    return Task.findByIdAndDelete(id);
  },

  aggregate(pipeline: mongoose.PipelineStage[]): Promise<Array<Record<string, unknown>>> {
    return Task.aggregate(pipeline);
  },
};
