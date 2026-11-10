import { act, render, screen, waitFor } from "@testing-library/react";
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
  vi.spyOn(notificationService, "deleteAll").mockResolvedValue({
    deletedCount: 1,
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
  await user.click(
    await screen.findByRole("button", { name: "Open task: Send report" }),
  );
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

it("marks one popup item read without closing or navigating", async () => {
  const user = userEvent.setup();
  mount();
  await user.click(screen.getByRole("button", { name: /notifications/i }));
  const button = await screen.findByRole("button", {
    name: "Mark as read: Send report",
  });
  vi.mocked(notificationService.list).mockResolvedValue({
    data: [{ ...item, readAt: new Date().toISOString() }],
    pageInfo: { pageNo: 1, pageSize: 10, totalCount: 1, totalPage: 1 },
  });
  await user.click(button);
  await waitFor(() =>
    expect(notificationService.markRead).toHaveBeenCalledWith(
      "n1",
      expect.anything(),
    ),
  );
  expect(screen.getByRole("dialog", { name: "Notifications" })).toBeVisible();
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Mark as read: Send report" }),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.getByRole("button", { name: "Open task: Send report" }),
  ).toHaveFocus();
});
it("marks all items read directly in the popup", async () => {
  const user = userEvent.setup();
  mount();
  await user.click(screen.getByRole("button", { name: /notifications/i }));
  await user.click(
    await screen.findByRole("button", { name: "Mark all as read" }),
  );
  await waitFor(() =>
    expect(notificationService.markAllRead).toHaveBeenCalled(),
  );
  expect(screen.getByRole("dialog")).toBeVisible();
});
it.each([false, true])(
  "confirms/cancels delete-all on history=%s and empties the list",
  async (history) => {
    const user = userEvent.setup();
    mount(history);
    if (!history)
      await user.click(screen.getByRole("button", { name: /notifications/i }));
    await screen.findByText("Send report");
    await user.click(
      screen.getByRole("button", { name: "Delete all notifications" }),
    );
    expect(notificationService.deleteAll).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(notificationService.deleteAll).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Delete all notifications" }),
    ).toHaveFocus();
    await user.click(
      screen.getByRole("button", { name: "Delete all notifications" }),
    );
    vi.mocked(notificationService.list).mockResolvedValue({
      data: [],
      pageInfo: { pageNo: 1, pageSize: 20, totalCount: 0, totalPage: 0 },
    });
    vi.mocked(notificationService.unreadCount).mockResolvedValue({ count: 0 });
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() =>
      expect(notificationService.deleteAll).toHaveBeenCalled(),
    );
    expect(await screen.findByText("You're all caught up")).toBeVisible();
    expect(screen.queryByText("Send report")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete all notifications" }),
    ).toBeDisabled();
  },
);
it("keeps entries and confirmation available when deletion fails", async () => {
  vi.mocked(notificationService.deleteAll).mockRejectedValue(
    new Error("offline"),
  );
  const user = userEvent.setup();
  mount();
  await user.click(screen.getByRole("button", { name: /notifications/i }));
  await screen.findByText("Send report");
  await user.click(
    screen.getByRole("button", { name: "Delete all notifications" }),
  );
  await user.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not update notifications",
  );
  expect(screen.getByText("Send report")).toBeVisible();
  expect(screen.getByRole("button", { name: "Confirm delete" })).toBeEnabled();
});
it("Escape cancels confirmation before closing the popup", async () => {
  const user = userEvent.setup();
  mount();
  await user.click(screen.getByRole("button", { name: /notifications/i }));
  await screen.findByText("Send report");
  await user.click(
    screen.getByRole("button", { name: "Delete all notifications" }),
  );
  await user.keyboard("{Escape}");
  expect(
    screen.queryByRole("button", { name: "Confirm delete" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(notificationService.deleteAll).not.toHaveBeenCalled();
});

it("disables conflicting actions while delete is pending", async () => {
  let resolve!: (value: { deletedCount: number }) => void;
  vi.mocked(notificationService.deleteAll).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const user = userEvent.setup();
  mount();
  await user.click(screen.getByRole("button", { name: /notifications/i }));
  await screen.findByText("Send report");
  await user.click(
    screen.getByRole("button", { name: "Delete all notifications" }),
  );
  await user.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(screen.getByRole("button", { name: "Confirm delete" })).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Mark all as read" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Open task: Send report" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Mark as read: Send report" }),
  ).toBeDisabled();
  await act(async () => resolve({ deletedCount: 1 }));
});

it("returns focus to the Unread filter when its last row is marked read", async () => {
  let read = false;
  vi.mocked(notificationService.list).mockImplementation(async (params) => ({
    data:
      params.filter === "unread" && read
        ? []
        : [{ ...item, readAt: read ? new Date().toISOString() : null }],
    pageInfo: {
      pageNo: 1,
      pageSize: params.pageSize,
      totalCount: params.filter === "unread" && read ? 0 : 1,
      totalPage: 1,
    },
  }));
  vi.mocked(notificationService.markRead).mockImplementation(async () => {
    read = true;
    return { ...item, readAt: new Date().toISOString() };
  });
  const user = userEvent.setup();
  mount(true);
  await screen.findByText("Send report");
  await user.click(screen.getByRole("button", { name: "Unread" }));
  await user.click(
    await screen.findByRole("button", { name: "Mark as read: Send report" }),
  );
  await screen.findByText("You're all caught up");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Unread" })).toHaveFocus(),
  );
});
it("Escape cancels confirmation even after focus leaves its controls", async () => {
  const user = userEvent.setup();
  mount();
  await user.click(screen.getByRole("button", { name: /notifications/i }));
  await screen.findByText("Send report");
  await user.click(
    screen.getByRole("button", { name: "Delete all notifications" }),
  );
  act(() =>
    screen.getByRole("button", { name: "Close notifications" }).focus(),
  );
  await user.keyboard("{Escape}");
  expect(
    screen.queryByRole("button", { name: "Confirm delete" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(notificationService.deleteAll).not.toHaveBeenCalled();
});
