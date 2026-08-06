import mongoose from 'mongoose';
import Project from '../models/Project.js';
import { IProjectDocument } from '../types/IProject.js';

export const projectRepository = {
  findById(id: mongoose.Types.ObjectId | string): Promise<IProjectDocument | null> {
    return Project.findById(id);
  },

  findByIdPopulated(id: mongoose.Types.ObjectId | string): Promise<IProjectDocument | null> {
    return Project.findById(id).populate('userId', 'name email');
  },

  findByUser(userId: mongoose.Types.ObjectId | string): Promise<IProjectDocument[]> {
    return Project.find({ userId });
  },

  findByUserPopulated(userId: mongoose.Types.ObjectId | string): Promise<IProjectDocument[]> {
    return Project.find({ userId }).populate('userId', 'name email').sort({ createdAt: -1 });
  },

  findAllPopulated(): Promise<IProjectDocument[]> {
    return Project.find().populate('userId', 'name email').sort({ createdAt: -1 });
  },

  findByUserAndName(
    userId: mongoose.Types.ObjectId | string,
    name: string
  ): Promise<IProjectDocument | null> {
    return Project.findOne({ userId, name });
  },

  create(data: Record<string, unknown>): Promise<IProjectDocument> {
    return Project.create(data);
  },

  updateById(
    id: mongoose.Types.ObjectId | string,
    update: Record<string, unknown>
  ): Promise<IProjectDocument | null> {
    return Project.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  updateByIdPopulated(
    id: mongoose.Types.ObjectId | string,
    update: Record<string, unknown>
  ): Promise<IProjectDocument | null> {
    return Project.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).populate(
      'userId',
      'name email'
    );
  },

  deleteById(id: mongoose.Types.ObjectId | string): Promise<IProjectDocument | null> {
    return Project.findOneAndDelete({ _id: id });
  },
};
