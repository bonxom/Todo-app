import http, { type RequestOptions } from "./httpClient";
import type { PaginatedResponse } from "../types/domain";
import type {
  NotificationDto,
  NotificationListParams,
} from "../types/notification";
export const notificationService = {
  async list(params: NotificationListParams, options?: RequestOptions) {
    return (
      await http.get<PaginatedResponse<NotificationDto>>("/api/notifications", {
        ...options,
        params,
      })
    ).data;
  },
  async unreadCount(options?: RequestOptions) {
    return (
      await http.get<{ count: number }>(
        "/api/notifications/unread-count",
        options,
      )
    ).data;
  },
  async markRead(id: string) {
    return (
      await http.patch<NotificationDto>(
        `/api/notifications/${encodeURIComponent(id)}/read`,
      )
    ).data;
  },
  async markAllRead() {
    return (
      await http.patch<{ modifiedCount: number }>("/api/notifications/read-all")
    ).data;
  },
};
