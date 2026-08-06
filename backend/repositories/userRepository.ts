import mongoose from 'mongoose';
import User from '../models/User.js';
import { IUserDocument } from '../types/IUser.js';

export const userRepository = {
  findById(id: mongoose.Types.ObjectId | string): Promise<IUserDocument | null> {
    return User.findById(id);
  },

  findByIdWithPassword(id: mongoose.Types.ObjectId | string): Promise<IUserDocument | null> {
    return User.findById(id).select('+password');
  },

  findByIdPopulated(id: mongoose.Types.ObjectId | string): Promise<IUserDocument | null> {
    return User.findById(id).populate('categories', 'name description');
  },

  findByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email });
  },

  findByEmailWithPassword(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email }).select('+password');
  },

  findAll(): Promise<IUserDocument[]> {
    return User.find().select('-password').populate('categories', 'name description');
  },

  create(data: Record<string, unknown>): Promise<IUserDocument> {
    return User.create(data);
  },

  updateById(
    id: mongoose.Types.ObjectId | string,
    update: Record<string, unknown>
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).select(
      '-password'
    );
  },

  deleteById(id: mongoose.Types.ObjectId | string): Promise<IUserDocument | null> {
    return User.findByIdAndDelete(id);
  },

  addCategory(
    userId: mongoose.Types.ObjectId | string,
    categoryId: mongoose.Types.ObjectId
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(userId, { $push: { categories: categoryId } });
  },

  removeCategory(
    userId: mongoose.Types.ObjectId | string,
    categoryId: mongoose.Types.ObjectId | string
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(userId, { $pull: { categories: categoryId } });
  },
};
