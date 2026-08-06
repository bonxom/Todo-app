import mongoose, { Schema } from 'mongoose';
import { IStatDocument, IStatModel } from '../types/IStat.js';

const statSchema = new Schema<IStatDocument, IStatModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    totalTasks: { type: Number, required: true, default: 0 },
    completedTasks: { type: Number, required: true, default: 0 },
    pendingTasks: { type: Number, required: true, default: 0 },
    inProgressTasks: { type: Number, required: true, default: 0 },
    givenUpTasks: { type: Number, required: true, default: 0 },
    dailyStats: [
      {
        date: { type: Date, required: true },
        completedTasks: { type: Number, required: true, default: 0 },
        completedOfEachCategory: [
          {
            categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
            categoryName: { type: String, required: true },
            count: { type: Number, required: true, default: 0 },
          },
        ],
        givenUpTasks: { type: Number, required: true, default: 0 },
        givenUpOfEachCategory: [
          {
            categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
            categoryName: { type: String, required: true },
            count: { type: Number, required: true, default: 0 },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

const Stat = mongoose.model<IStatDocument, IStatModel>('Stat', statSchema);
export default Stat;
