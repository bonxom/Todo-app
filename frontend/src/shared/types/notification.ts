export interface NotificationDto {
  _id: string;
  taskId: string;
  type: "due_soon" | "overdue";
  taskTitle: string;
  dueAt: string;
  readAt: string | null;
  createdAt: string;
}
export interface NotificationListParams {
  pageNo: number;
  pageSize: number;
  filter: "all" | "unread";
}
