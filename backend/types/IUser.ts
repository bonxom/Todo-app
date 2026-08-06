import { Document, Model, Types } from 'mongoose';

export interface IUser {
  email: string;
  password: string;
  name: string;
  dob?: Date;
  nationality?: string;
  role: 'USER' | 'ADMIN';
  categories: Types.ObjectId[];
  avatarUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(plainPassword: string): Promise<boolean>;
}

export interface IUserDocument extends IUser, Document, IUserMethods {}

export interface IUserModel extends Model<IUserDocument> {}
