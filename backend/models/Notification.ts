import mongoose, { Schema } from "mongoose";
import type { INotification } from "../types/INotification.js";
const schema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    taskId: { type: Schema.Types.ObjectId, required: true, ref: "Task" },
    type: { type: String, enum: ["due_soon", "overdue"], required: true },
    dueAt: { type: Date, required: true },
    taskTitle: { type: String, required: true },
    readAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.index(
  { recipientId: 1, taskId: 1, type: 1, dueAt: 1 },
  { unique: true, name: "notification_once" },
);
schema.index({ recipientId: 1, createdAt: -1, _id: -1 });
schema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
export default mongoose.model<INotification>("Notification", schema);
