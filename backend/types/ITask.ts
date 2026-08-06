import { Document, Model, Types } from 'mongoose';
import { ICategory } from './ICategory.js';
import { IProject } from './IProject.js';
import { IUser } from './IUser.js';

export interface ITask {
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'given-up';
  priority: 'Low' | 'Medium' | 'High';
  categoryId: Types.ObjectId | null;
  projectId: Types.ObjectId | null;
  startDate: Date;
  dueDate?: Date;
  completedAt?: Date;
  isOverDue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskDocument extends ITask, Document {}

export interface ITaskModel extends Model<ITaskDocument> {}
