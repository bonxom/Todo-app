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

export interface PushPreferences {
  taskDeadlines: boolean;
  agentReplies: boolean;
}

export interface PushConfigResponse {
  supported: boolean;
  publicKey: string | null;
}

export interface PushSubscriptionStatusResponse {
  subscribed: boolean;
  prefs: PushPreferences | null;
}

export interface PushSubscriptionUpsertPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  prefs?: Partial<PushPreferences>;
  userAgent?: string;
}
