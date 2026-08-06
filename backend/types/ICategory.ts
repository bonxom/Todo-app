import { Document, Model, Types } from 'mongoose';

export interface ICategory {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategoryDocument extends ICategory, Document {}

export interface ICategoryModel extends Model<ICategoryDocument> {
  findByUserAndName(userId: Types.ObjectId | string, name: string): Promise<ICategoryDocument | null>;
}
