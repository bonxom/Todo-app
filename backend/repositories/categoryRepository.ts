import mongoose from 'mongoose';
import Category from '../models/Category.js';
import { ICategoryDocument } from '../types/ICategory.js';

export const categoryRepository = {
  findById(id: mongoose.Types.ObjectId | string): Promise<ICategoryDocument | null> {
    return Category.findById(id);
  },

  findByIdPopulated(id: mongoose.Types.ObjectId | string): Promise<ICategoryDocument | null> {
    return Category.findById(id).populate('userId', 'name email');
  },

  findByUser(userId: mongoose.Types.ObjectId | string): Promise<ICategoryDocument[]> {
    return Category.find({ userId }).populate('userId', 'name email');
  },

  findAll(): Promise<ICategoryDocument[]> {
    return Category.find({}).populate('userId', 'name email');
  },

  findByUserAndName(
    userId: mongoose.Types.ObjectId | string,
    name: string
  ): Promise<ICategoryDocument | null> {
    return Category.findOne({ userId, name });
  },

  create(data: Record<string, unknown>): Promise<ICategoryDocument> {
    return Category.create(data);
  },

  updateById(
    id: mongoose.Types.ObjectId | string,
    update: Record<string, unknown>
  ): Promise<ICategoryDocument | null> {
    return Category.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  deleteById(id: mongoose.Types.ObjectId | string): Promise<ICategoryDocument | null> {
    return Category.findByIdAndDelete(id);
  },
};
