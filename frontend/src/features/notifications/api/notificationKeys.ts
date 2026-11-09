import type { NotificationListParams } from "@/shared/types/notification";
export const notificationKeys = {
  all: (userId: string) => ["notifications", userId] as const,
  list: (userId: string, params: NotificationListParams) =>
    ["notifications", userId, "list", params] as const,
  count: (userId: string) => ["notifications", userId, "count"] as const,
};
