import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { notificationService } from "@/shared/services/notificationService";
import type { NotificationListParams } from "@/shared/types/notification";
import { notificationKeys } from "./notificationKeys";
export function useNotificationSession() {
  const userId = useAuthStore((s) => s.user?._id ?? s.user?.id ?? "");
  const ready = useAuthStore((s) => s.isAuthReady && Boolean(s.token));
  return { userId, enabled: ready && Boolean(userId) };
}
export function useUnreadCountQuery() {
  const { userId, enabled } = useNotificationSession();
  const autoRefresh = useSettingsStore((s) => s.notifications.autoRefresh);
  return useQuery({
    queryKey: notificationKeys.count(userId),
    queryFn: ({ signal }) => notificationService.unreadCount({ signal }),
    enabled,
    refetchInterval: autoRefresh ? 60_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: "always",
  });
}
export function useNotificationsQuery(
  params: NotificationListParams,
  active = true,
) {
  const { userId, enabled } = useNotificationSession();
  const autoRefresh = useSettingsStore((s) => s.notifications.autoRefresh);
  return useQuery({
    queryKey: notificationKeys.list(userId, params),
    queryFn: ({ signal }) => notificationService.list(params, { signal }),
    enabled: enabled && active,
    refetchInterval: autoRefresh ? 60_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: "always",
    refetchOnMount: "always",
  });
}
