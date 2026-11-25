import http, { type RequestOptions } from "./httpClient";
import type { PaginatedResponse } from "../types/domain";
import type {
  NotificationDto,
  NotificationListParams,
  PushConfigResponse,
  PushPreferences,
  PushSubscriptionStatusResponse,
  PushSubscriptionUpsertPayload,
} from "../types/notification";
export const notificationService = {
  async deleteAll() {
    return (await http.delete<{ deletedCount: number }>("/api/notifications"))
      .data;
  },
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
  async getPushConfig(options?: RequestOptions) {
    return (
      await http.get<PushConfigResponse>(
        "/api/notifications/push/config",
        options,
      )
    ).data;
  },
  async getCurrentPushSubscription(endpoint: string, options?: RequestOptions) {
    return (
      await http.get<PushSubscriptionStatusResponse>(
        "/api/notifications/push/subscriptions/current",
        {
          ...options,
          params: { endpoint },
        },
      )
    ).data;
  },
  async savePushSubscription(payload: PushSubscriptionUpsertPayload) {
    return (
      await http.post<PushSubscriptionStatusResponse>(
        "/api/notifications/push/subscriptions",
        payload,
      )
    ).data;
  },
  async updatePushPreferences(payload: {
    endpoint: string;
    prefs: Partial<PushPreferences>;
  }) {
    return (
      await http.patch<PushSubscriptionStatusResponse>(
        "/api/notifications/push/subscriptions",
        payload,
      )
    ).data;
  },
  async deletePushSubscription(endpoint: string) {
    return (
      await http.delete<{ removed: boolean }>(
        "/api/notifications/push/subscriptions",
        {
          data: { endpoint },
        },
      )
    ).data;
  },
};
