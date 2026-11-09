import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import NotificationBell from "../components/NotificationBell";
import NotificationsPage from "../NotificationsPage";
import { notificationService } from "@/shared/services/notificationService";
import { useAuthStore } from "@/stores/useAuthStore";
import i18n from "@/shared/i18n";
const item = {
  _id: "n1",
  taskId: "507f1f77bcf86cd799439011",
  type: "due_soon" as const,
  taskTitle: "Send report",
  dueAt: "2026-11-09T20:00:00Z",
  createdAt: "2026-11-09T10:00:00Z",
  readAt: null,
};
let client: QueryClient;
beforeEach(() => {
  void i18n.changeLanguage("en");
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  useAuthStore.setState({
    user: { _id: "alice", name: "Alice", email: "a@example.com", role: "USER" },
    token: "token",
    isAuthReady: true,
  });
  vi.spyOn(notificationService, "unreadCount").mockResolvedValue({
    count: 100,
  });
  vi.spyOn(notificationService, "list").mockResolvedValue({
    data: [item],
    pageInfo: { pageNo: 1, pageSize: 20, totalCount: 1, totalPage: 1 },
  });
  vi.spyOn(notificationService, "markRead").mockResolvedValue({
    ...item,
    readAt: new Date().toISOString(),
  });
  vi.spyOn(notificationService, "markAllRead").mockResolvedValue({
    modifiedCount: 1,
  });
});
afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
});
function mount(page = false) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        {page ? <NotificationsPage /> : <NotificationBell />}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
it("shows capped count, opens latest items and restores focus on Escape", async () => {
  const user = userEvent.setup();
  mount();
  expect(await screen.findByText("99+")).toBeVisible();
  const trigger = screen.getByRole("button", { name: /notifications.*100/i });
  await user.click(trigger);
  expect(
    await screen.findByRole("dialog", { name: "Notifications" }),
  ).toBeVisible();
  expect(await screen.findByText("Send report")).toBeVisible();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
it("hides zero badge", async () => {
  vi.mocked(notificationService.unreadCount).mockResolvedValue({ count: 0 });
  mount();
  await waitFor(() =>
    expect(notificationService.unreadCount).toHaveBeenCalled(),
  );
  expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
});
it("keeps unread item and shows error when mark-read fails", async () => {
  vi.mocked(notificationService.markRead).mockRejectedValue(
    new Error("offline"),
  );
  const user = userEvent.setup();
  mount();
  await user.click(screen.getByRole("button", { name: /notifications/i }));
  await user.click(await screen.findByRole("button", { name: /Send report/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not update notifications",
  );
  expect(screen.getByText("Send report")).toBeVisible();
});
it("history filters unread and marks all read", async () => {
  const user = userEvent.setup();
  mount(true);
  await screen.findByText("Send report");
  await user.click(screen.getByRole("button", { name: "Unread" }));
  await waitFor(() =>
    expect(notificationService.list).toHaveBeenCalledWith(
      { pageNo: 1, pageSize: 20, filter: "unread" },
      expect.anything(),
    ),
  );
  await user.click(screen.getByRole("button", { name: "Mark all as read" }));
  await waitFor(() =>
    expect(notificationService.markAllRead).toHaveBeenCalled(),
  );
});
it("shows empty history and retryable load errors", async () => {
  vi.mocked(notificationService.list)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({
      data: [],
      pageInfo: { pageNo: 1, pageSize: 20, totalCount: 0, totalPage: 0 },
    });
  const user = userEvent.setup();
  mount(true);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not load notifications",
  );
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("You're all caught up")).toBeVisible();
});
