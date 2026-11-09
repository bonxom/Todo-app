import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/shared/services/notificationService";
import { notificationKeys } from "./notificationKeys";
import { useNotificationSession } from "./notificationQueries";
export function useMarkNotificationReadMutation() {
  const client = useQueryClient();
  const { userId } = useNotificationSession();
  return useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: notificationKeys.all(userId) }),
  });
}
export function useMarkAllNotificationsReadMutation() {
  const client = useQueryClient();
  const { userId } = useNotificationSession();
  return useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: notificationKeys.all(userId) }),
  });
}
