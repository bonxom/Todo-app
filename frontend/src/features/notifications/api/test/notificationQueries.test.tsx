import { act, renderHook, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { useUnreadCountQuery } from "../notificationQueries";
import { notificationService } from "@/shared/services/notificationService";
import { useAuthStore } from "@/stores/useAuthStore";
const user = {
  _id: "alice",
  email: "alice@example.com",
  name: "Alice",
  role: "USER" as const,
};
let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ user, token: "token", isAuthReady: true });
  focusManager.setFocused(true);
});
afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
  focusManager.setFocused(undefined);
});
it("loads the authenticated count and isolates account switches", async () => {
  const fetch = vi
    .spyOn(notificationService, "unreadCount")
    .mockResolvedValueOnce({ count: 3 })
    .mockResolvedValueOnce({ count: 1 });
  const { result } = renderHook(() => useUnreadCountQuery(), { wrapper });
  await waitFor(() => expect(result.current.data).toEqual({ count: 3 }));
  act(() => useAuthStore.setState({ user: { ...user, _id: "bob" } }));
  expect(result.current.data).toBeUndefined();
  await waitFor(() => expect(result.current.data).toEqual({ count: 1 }));
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("does not fetch before auth is ready or after logout", async () => {
  useAuthStore.setState({ isAuthReady: false });
  const fetch = vi
    .spyOn(notificationService, "unreadCount")
    .mockResolvedValue({ count: 2 });
  renderHook(() => useUnreadCountQuery(), { wrapper });
  expect(fetch).not.toHaveBeenCalled();
  act(() => useAuthStore.setState({ isAuthReady: true }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  act(() => useAuthStore.setState({ user: null, token: null }));
  focusManager.setFocused(false);
  focusManager.setFocused(true);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("polls each minute only while visible", async () => {
  vi.useFakeTimers();
  const fetch = vi
    .spyOn(notificationService, "unreadCount")
    .mockResolvedValue({ count: 2 });
  renderHook(() => useUnreadCountQuery(), { wrapper });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(59_999);
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  act(() => focusManager.setFocused(false));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  act(() => focusManager.setFocused(true));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(fetch).toHaveBeenCalledTimes(3);
});
