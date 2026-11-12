import { test, expect } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";

test("calendar hover stays inside the scrollport after scrolling a long task", async ({
  page,
}) => {
  await dashboardFixture(page);
  await page.setViewportSize({ width: 1600, height: 1100 });
  const at = (hour: number) => {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  await page.route("**/api/tasks?**", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            _id: "long",
            title: "Long calendar task",
            startDate: at(9),
            dueDate: at(18),
            status: "in-progress",
            priority: "Medium",
            categoryId: { _id: "work", name: "Work" },
            projectId: null,
          },
        ],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 1, totalPage: 1 },
      },
    }),
  );
  await page.goto("/calendar");
  const task = page.locator(".calendar-timeline-task");
  await expect(task).toHaveCount(1);
  const scroll = page.locator(".calendar-week-timeline-scroll");
  await scroll.evaluate((el) => {
    el.scrollTop =
      14 *
      parseFloat(
        getComputedStyle(el).getPropertyValue("--timeline-hour-height"),
      );
  });
  const box = (await scroll.boundingBox())!;
  const taskBox = (await task.boundingBox())!;
  await page.mouse.move(taskBox.x + taskBox.width / 2, box.y + 150);
  const cursor = page.getByTestId("custom-cursor", { exact: true });
  await expect(cursor).toHaveAttribute("data-mode", "snap");

  await expect(cursor).not.toHaveCSS("clip-path", "none");
  const visibleTop = await cursor.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const clip = getComputedStyle(el).clipPath;
    return r.top + parseFloat(clip.slice(6));
  });
  const header = (await page
    .locator(".calendar-week-timeline-header")
    .boundingBox())!;
  expect(visibleTop).toBeGreaterThanOrEqual(header.y + header.height - 1);
  await page.screenshot({ path: "/tmp/cursor-clipping.png" });
});
