import type { Page } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";
export async function notificationsFixture(page: Page) {
  await dashboardFixture(page);
  const items = Array.from({ length: 21 }, (_, i) => ({
    _id: `notification-${i}`,
    taskId: "507f1f77bcf86cd799439011",
    type: i % 2 ? "overdue" : "due_soon",
    taskTitle: `Deadline report ${i + 1}`,
    dueAt: "2026-11-09T20:00:00Z",
    createdAt: "2026-11-09T10:00:00Z",
    readAt: null as string | null,
  }));
  await page.route("**/api/notifications**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (route.request().method() === "DELETE") {
      const deletedCount = items.length;
      items.splice(0);
      return route.fulfill({ json: { deletedCount } });
    }
    if (path.endsWith("/unread-count"))
      return route.fulfill({
        json: { count: items.filter((n) => !n.readAt).length },
      });
    if (path.endsWith("/read-all")) {
      items.forEach((n) => (n.readAt = new Date().toISOString()));
      return route.fulfill({ json: { modifiedCount: 21 } });
    }
    if (path.endsWith("/read")) {
      const item = items.find(
        (n) => path === `/api/notifications/${n._id}/read`,
      );
      if (item) item.readAt = new Date().toISOString();
      return route.fulfill({ json: item });
    }
    const pageNo = Number(url.searchParams.get("pageNo") || 1);
    const pageSize = Number(url.searchParams.get("pageSize") || 20);
    const filtered =
      url.searchParams.get("filter") === "unread"
        ? items.filter((n) => !n.readAt)
        : items;
    return route.fulfill({
      json: {
        data: filtered.slice((pageNo - 1) * pageSize, pageNo * pageSize),
        pageInfo: {
          pageNo,
          pageSize,
          totalCount: filtered.length,
          totalPage: Math.ceil(filtered.length / pageSize),
        },
      },
    });
  });
  await page.route("**/api/tasks/507f1f77bcf86cd799439011", (route) =>
    route.fulfill({ status: 404, json: { message: "Not found" } }),
  );
}
