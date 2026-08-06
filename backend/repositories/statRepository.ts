import mongoose from 'mongoose';
import Stat from '../models/Stat.js';
import Task from '../models/Task.js';
import Category from '../models/Category.js';
import Project from '../models/Project.js';
import { IStatDocument } from '../types/IStat.js';
import { ITaskDocument } from '../types/ITask.js';
import { IUserDocument } from '../types/IUser.js';

export const statRepository = {
  findByUser(userId: mongoose.Types.ObjectId | string): Promise<IStatDocument | null> {
    return Stat.findOne({ userId });
  },

  async getTasksByUser(user: IUserDocument): Promise<ITaskDocument[]> {
    if (user.role === 'ADMIN') {
      return Task.find({})
        .populate('categoryId', 'name userId')
        .populate('projectId', 'name userId');
    }

    const [userCategories, userProjects] = await Promise.all([
      Category.find({ userId: user._id }).select('_id name'),
      Project.find({ userId: user._id }).select('_id'),
    ]);

    const ownershipClauses: Array<Record<string, unknown>> = [];
    if (userCategories.length > 0) {
      ownershipClauses.push({
        categoryId: { $in: userCategories.map((c) => c._id) },
      });
    }
    if (userProjects.length > 0) {
      ownershipClauses.push({
        projectId: { $in: userProjects.map((p) => p._id) },
      });
    }

    if (ownershipClauses.length === 0) return [];

    const query = ownershipClauses.length === 1 ? ownershipClauses[0] : { $or: ownershipClauses };

    return Task.find(query)
      .populate('categoryId', 'name userId')
      .populate('projectId', 'name userId');
  },
};
