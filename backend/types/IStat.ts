import { Document, Model, Types } from 'mongoose';

export interface IDailyCategoryStat {
  categoryId: Types.ObjectId;
  categoryName: string;
  count: number;
}

export interface IDailyStat {
  date: Date;
  completedTasks: number;
  completedOfEachCategory: IDailyCategoryStat[];
  givenUpTasks: number;
  givenUpOfEachCategory: IDailyCategoryStat[];
}

export interface IStat {
  userId: Types.ObjectId;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  givenUpTasks: number;
  dailyStats: IDailyStat[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IStatDocument extends IStat, Document {}

export interface IStatModel extends Model<IStatDocument> {}
