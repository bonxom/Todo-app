import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useDeleteAllNotificationsMutation,
} from "../notificationMutations";
import { notificationService } from "@/shared/services/notificationService";
import { useAuthStore } from "@/stores/useAuthStore";
afterEach(() => vi.restoreAllMocks());
it("invalidates all current-user notification views only after successful mutations", async () => {
  useAuthStore.setState({
    user: { _id: "alice", name: "A", email: "a@b.com", role: "USER" },
    token: "t",
    isAuthReady: true,
  });
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  vi.spyOn(notificationService, "markAllRead").mockResolvedValue({
    modifiedCount: 1,
  });
  const remove = vi
    .spyOn(notificationService, "deleteAll")
    .mockResolvedValue({ deletedCount: 5 });
  const mark = vi
    .spyOn(notificationService, "markRead")
    .mockRejectedValue(new Error("offline"));
  const { result } = renderHook(
    () => ({
      one: useMarkNotificationReadMutation(),
      all: useMarkAllNotificationsReadMutation(),
      remove: useDeleteAllNotificationsMutation(),
    }),
    { wrapper },
  );
  await act(async () => {
    await expect(result.current.one.mutateAsync("id")).rejects.toThrow(
      "offline",
    );
  });
  expect(invalidate).not.toHaveBeenCalled();
  await act(async () => {
    await result.current.all.mutateAsync();
  });
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ["notifications", "alice"],
  });
  expect(mark).toHaveBeenCalledWith("id", expect.anything());
  invalidate.mockClear();
  await act(async () => {
    await result.current.remove.mutateAsync();
  });
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ["notifications", "alice"],
  });
  remove.mockRejectedValueOnce(new Error("offline"));
  invalidate.mockClear();
  await act(async () => {
    await expect(result.current.remove.mutateAsync()).rejects.toThrow(
      "offline",
    );
  });
  expect(invalidate).not.toHaveBeenCalled();
  client.clear();
});
