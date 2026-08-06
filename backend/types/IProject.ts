import { Document, Model, Types } from 'mongoose';

export interface IProject {
  userId: Types.ObjectId;
  name: string;
  description: string;
  color: string;
  status: 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectDocument extends IProject, Document {}

export interface IProjectModel extends Model<IProjectDocument> {
  findByUserAndName(userId: Types.ObjectId | string, name: string): Promise<IProjectDocument | null>;
}
