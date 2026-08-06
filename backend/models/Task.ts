import mongoose, { Schema } from 'mongoose';
import { ITaskDocument, ITaskModel } from '../types/ITask.js';
import { getStartOfToday } from '../utils/dateTime.js';

const taskSchema = new Schema<ITaskDocument, ITaskModel>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'given-up'],
      default: 'pending',
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    startDate: { type: Date, default: getStartOfToday },
    dueDate: { type: Date },
    completedAt: { type: Date },
    isOverDue: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.index({ categoryId: 1 });
taskSchema.index({ projectId: 1 });
taskSchema.index({ dueDate: 1 });

const Task = mongoose.model<ITaskDocument, ITaskModel>('Task', taskSchema);
export default Task;
