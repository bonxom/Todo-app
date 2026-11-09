import type { Types } from "mongoose";
export type NotificationType = "due_soon" | "overdue";
export interface NotificationInsert {
  recipientId: Types.ObjectId;
  taskId: Types.ObjectId;
  type: NotificationType;
  dueAt: Date;
  taskTitle: string;
}
export interface INotification extends NotificationInsert {
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface NotificationListParams {
  pageNo: number;
  pageSize: number;
  filter: "all" | "unread";
}
