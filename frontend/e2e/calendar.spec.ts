import { test, expect, type Page } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";

async function screenshot(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `artifacts/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}

test("calendar navigation, project filters, dialogs and themes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await dashboardFixture(page);
  await page.goto("/calendar");
  await expect(
    page.getByRole("heading", { name: "Calendar", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".calendar-day")).toHaveCount(7);
  const timeDetailSelect = page.getByRole("combobox", { name: "Time detail" });
  await expect(timeDetailSelect).toBeVisible();
  await expect(timeDetailSelect).toHaveValue("30");
  await screenshot(page, "calendar-desktop");
  await timeDetailSelect.selectOption("15");
  await expect(page.getByText("09:15")).toBeVisible();
  await screenshot(page, "calendar-timeline-15m");
  await timeDetailSelect.selectOption("60");
  await expect(page.getByText("23:00")).toBeVisible();
  await screenshot(page, "calendar-timeline-60m");
  await timeDetailSelect.selectOption("30");
  await page.getByRole("button", { name: "Next week", exact: true }).click();
  await expect(page.getByText("A little breathing room")).toBeVisible();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.getByRole("button", { name: "Show project filters" }).click();
  await page
    .getByRole("button", { name: "Add Website refresh to project filters" })
    .click();
  await expect(
    page.getByText("1 project selected", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search projects" })
    .fill("nothing matches");
  await expect(page.getByText("No matching projects")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search projects" }).fill("");
  await screenshot(page, "calendar-filters");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByRole("button", { name: "Hide project filters" }).click();
  await page.getByRole("button", { name: "Month", exact: true }).click();
  expect(await page.locator(".calendar-day").count()).toBeGreaterThanOrEqual(
    28,
  );
  await expect(page.getByRole("combobox", { name: "Time detail" })).toHaveCount(
    0,
  );
  await screenshot(page, "calendar-month");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".calendar-day[aria-pressed=true]")).toHaveCount(1);
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Time detail" }),
  ).toBeVisible();
  await expect(page.locator(".calendar-day[aria-pressed=true]")).toHaveCount(1);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.getByRole("button", { name: "Add Task", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await screenshot(page, "calendar-add-task");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Coding", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await screenshot(page, "calendar-dark");
  expect(errors).toEqual([]);
});

test("mobile calendar and empty schedule", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await dashboardFixture(page, true);
  await page.goto("/calendar");
  await expect(page.getByText("A little breathing room")).toBeVisible();
  await screenshot(page, "calendar-mobile-week");
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await screenshot(page, "calendar-mobile-month");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Plan a task", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Show project filters" }).click();
  await page.getByRole("button", { name: "Add Project", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("create, complete and reschedule a task", async ({ page }) => {
  await dashboardFixture(page);
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Add Task", exact: true }).click();
  await page.getByLabel("Task Title").fill("Plan a thoughtful week");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add Task", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page
      .locator(".calendar-agenda")
      .getByText("Plan a thoughtful week", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Mark Explore directions for the homepage as completed",
      exact: true,
    })
    .click();
  await expect(
    page.locator(".calendar-agenda").getByText("1/3 complete", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("[data-cal-task-name]")
      .filter({ hasText: "Explore directions for the homepage" }),
  ).toHaveClass(/line-through/);
  await expect(
    page.getByRole("status", { name: "Loading calendar range" }),
  ).toHaveCount(0);
  const source = page
    .locator("[data-cal-task-card]")
    .filter({ hasText: "Plan a thoughtful week" });
  const target = page
    .locator("[data-timeline-header-day][aria-pressed=false]")
    .first();
  const request = page.waitForRequest(
    (req) => req.method() === "PUT" && req.url().includes("/api/tasks/"),
  );
  // Bring both drag endpoints into view after completing a task in the agenda.
  await page.locator(".calendar-board").scrollIntoViewIfNeeded();
  await page.locator(".calendar-week-timeline-scroll").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page
    .locator(".calendar-board")
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await source.dragTo(target);
  await request;
  await target.click();
  await expect(
    page
      .locator(".calendar-agenda")
      .getByText("Plan a thoughtful week", { exact: true }),
  ).toBeVisible();
});

test("failed calendar request can be retried", async ({ page }) => {
  await dashboardFixture(page);
  let fail = true;
  await page.route("**/api/tasks?**", (route) =>
    fail
      ? route.fulfill({
          status: 500,
          json: { message: "Temporarily unavailable" },
        })
      : route.fallback(),
  );
  await page.goto("/calendar");
  await expect(page.getByText("Unable to load the calendar")).toBeVisible({
    timeout: 15000,
  });
  fail = false;
  await page.getByRole("button", { name: "Try Again" }).click();
  await expect(page.locator(".calendar-board")).toBeVisible();
});

test("populated calendar stays usable on small screens", async ({ page }) => {
  await dashboardFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/calendar");
  await expect(
    page.locator('.calendar-day[aria-current="date"]'),
  ).toBeInViewport();
  await screenshot(page, "calendar-mobile-populated");
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await screenshot(page, "calendar-mobile-month-populated");
  await page.locator('.calendar-day[aria-current="date"]').focus();
  await page.keyboard.press("Enter");
  await expect(
    page
      .locator(".calendar-agenda")
      .getByText("Explore directions for the homepage", { exact: true }),
  ).toBeVisible();
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await screenshot(page, "calendar-mobile-dark");
});

test("agenda shared rows support completion, restore, editing and menus", async ({
  page,
}) => {
  await dashboardFixture(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/calendar");
  const agenda = page.locator(".calendar-agenda");
  const title = "Explore directions for the homepage";
  await agenda
    .getByRole("button", { name: `Mark ${title} as completed`, exact: true })
    .click();
  await expect(agenda.getByText("1/2 complete", { exact: true })).toBeVisible();
  await agenda.screenshot({ path: "artifacts/calendar-agenda-completed.png" });
  await agenda
    .getByRole("button", {
      name: `Restore ${title} to in-progress`,
      exact: true,
    })
    .click();
  await expect(agenda.getByText("0/2 complete", { exact: true })).toBeVisible();
  await agenda.getByRole("button", { name: title, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const menu = agenda.getByRole("button", { name: `Actions for ${title}` });
  await menu.click();
  await expect(
    agenda.getByRole("button", { name: "Edit task", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  const lastMenu = agenda.getByRole("button", {
    name: "Actions for Send the first round of design feedback",
  });
  await lastMenu.click();
  await agenda.getByRole("button", { name: "Edit task", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
});

test("pending agenda task can be rejected directly", async ({ page }) => {
  await dashboardFixture(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Month", exact: true }).click();
  const title = "Plan next week’s studio priorities";
  await page
    .locator(".calendar-day")
    .filter({ hasText: title })
    .locator(".calendar-day-number")
    .click();
  const agenda = page.locator(".calendar-agenda");
  const reject = agenda.getByRole("button", {
    name: `Reject ${title}`,
    exact: true,
  });
  await expect(reject).toBeVisible();
  await agenda.screenshot({ path: "artifacts/calendar-pending-reject.png" });
  const deleted = page.waitForRequest(
    (req) => req.method() === "DELETE" && req.url().includes("/api/tasks/3"),
  );
  await reject.click();
  await deleted;
  await expect(agenda.getByText(title, { exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".calendar-board")).toBeVisible();
  await expect(
    page.locator("[data-cal-task-name]").filter({ hasText: title }),
  ).toHaveCount(0);
});

// Exercise the schedule as a user with real time blocks, not just all-day fixtures.
test("week subviews, zoom and task details remain usable on desktop and mobile", async ({
  page,
}) => {
  await dashboardFixture(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const at = (offset: number, hour: number, minute = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };
  const tasks = [
    {
      _id: "review",
      title: "Weekly architecture review",
      startDate: at(0, 9),
      dueDate: at(0, 10, 30),
      description: "Review service boundaries and agree on the next steps.",
    },
    {
      _id: "sync",
      title: "Design feedback",
      startDate: at(0, 10),
      dueDate: at(0, 11),
      description: "Walk through the new calendar experience.",
    },
    {
      _id: "focus",
      title: "Build the calendar",
      startDate: at(0, 14),
      dueDate: at(0, 16),
      description: "A quiet block for focused work.",
    },
    {
      _id: "deadline",
      title: "Send the weekly report",
      startDate: null,
      dueDate: at(1, 17, 30),
      description: "Summarize progress and share the open questions.",
    },
    {
      _id: "workout",
      title: "Gym — upper body",
      startDate: at(-1, 18),
      dueDate: at(-1, 19, 15),
      description: "Strength and mobility.",
    },
  ].map((task) => ({
    ...task,
    status: "in-progress",
    priority: "Medium",
    categoryId: { _id: "work", name: "Work" },
    projectId: { _id: "website", name: "Website refresh", color: "#6c8060" },
  }));
  await page.route("**/api/tasks?**", (route) =>
    route.fulfill({
      json: {
        data: tasks,
        pageInfo: {
          pageNo: 1,
          pageSize: 100,
          totalCount: tasks.length,
          totalPage: 1,
        },
      },
    }),
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/calendar");
  const board = page.locator(".calendar-board");
  const timeline = page.locator(".calendar-week-timeline-scroll");
  const detail = page.getByRole("combobox", { name: "Time detail" });
  await expect(
    page.getByRole("button", { name: "Detailed", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await board.scrollIntoViewIfNeeded();
  await expect
    .poll(() => timeline.evaluate((el) => el.scrollTop))
    .toBeCloseTo(576, 0);
  await page.mouse.move(0, 0);
  await board.screenshot({
    path: "artifacts/calendar-review-detailed-desktop.png",
  });
  const review = board.getByRole("button", {
    name: "Edit Weekly architecture review",
    exact: true,
  });
  const sync = board.getByRole("button", {
    name: "Edit Design feedback",
    exact: true,
  });
  const a = await review.boundingBox(),
    b = await sync.boundingBox();
  expect(a && b).toBeTruthy();
  expect(a!.x + a!.width).toBeLessThanOrEqual(b!.x);
  expect(a!.height).toBeCloseTo(108, 0);
  await review.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  const anchorMinute = await timeline.evaluate((el) => el.scrollTop / 1.2);
  await detail.selectOption("15");
  await expect
    .poll(async () =>
      Math.abs(
        (await timeline.evaluate((el) => el.scrollTop)) - anchorMinute * 2.4,
      ),
    )
    .toBeLessThanOrEqual(1);
  await page.mouse.move(0, 0);
  await board.screenshot({ path: "artifacts/calendar-review-15m.png" });
  await detail.selectOption("60");
  await expect
    .poll(async () =>
      Math.abs(
        (await timeline.evaluate((el) => el.scrollTop)) - anchorMinute * 0.6,
      ),
    )
    .toBeLessThanOrEqual(1);
  await detail.selectOption("30");
  const savedScroll = await timeline.evaluate((el) => el.scrollTop);
  await page.getByRole("button", { name: "Compact", exact: true }).click();
  await expect(timeline).toHaveCount(0);
  await expect(detail).toHaveCount(0);
  await expect(page.locator(".calendar-days > .calendar-day")).toHaveCount(7);
  await page.mouse.move(0, 0);
  await board.screenshot({
    path: "artifacts/calendar-review-compact-desktop.png",
  });
  await board
    .getByRole("button", {
      name: "Edit Weekly architecture review",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Compact", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Compact", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Detailed", exact: true }).click();
  await expect(detail).toHaveValue("30");
  await expect
    .poll(() => timeline.evaluate((el) => el.scrollTop))
    .toBeCloseTo(savedScroll, 0);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.mouse.move(0, 0);
  await board.screenshot({
    path: "artifacts/calendar-review-detailed-dark.png",
  });
  await page.getByRole("button", { name: "Compact", exact: true }).click();
  await page.mouse.move(0, 0);
  await board.screenshot({
    path: "artifacts/calendar-review-compact-dark.png",
  });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.mouse.move(0, 0);
  await board.screenshot({
    path: "artifacts/calendar-review-compact-mobile.png",
  });
  await page.getByRole("button", { name: "Detailed", exact: true }).click();
  await page.mouse.move(0, 0);
  await board.screenshot({
    path: "artifacts/calendar-review-detailed-mobile.png",
  });
  // Scroll within the schedule and check the sticky local-time corner.
  await timeline.hover();
  await page.mouse.wheel(220, 250);
  await expect
    .poll(() => timeline.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(600);
  const corner = await page
    .locator(".calendar-week-timeline-corner")
    .boundingBox();
  const scroller = await timeline.boundingBox();
  expect(Math.abs(corner!.x - scroller!.x)).toBeLessThan(2);
  await page.mouse.move(0, 0);
  await board.screenshot({
    path: "artifacts/calendar-review-mobile-scrolled.png",
  });
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("Vietnamese week controls fit narrow screens in both modes", async ({
  page,
}) => {
  await dashboardFixture(page);
  await page.addInitScript(() => localStorage.setItem("orbit.language", "vi"));
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/calendar");
  const board = page.locator(".calendar-board");
  await expect(
    page.getByRole("button", { name: "Chi tiết", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tóm gọn", exact: true }),
  ).toBeVisible();
  await page.mouse.move(0, 0);
  await board.screenshot({
    path: "artifacts/calendar-review-vietnamese-320-detailed.png",
  });
  await page.getByRole("button", { name: "Tóm gọn", exact: true }).click();
  await page.mouse.move(0, 0);
  await board.screenshot({
    path: "artifacts/calendar-review-vietnamese-320-compact.png",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("compact Week supports date selection, drag move and Ctrl-drag copy", async ({
  page,
}) => {
  await dashboardFixture(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Compact", exact: true }).click();
  const board = page.locator(".calendar-board");
  const title = "Explore directions for the homepage";
  const source = board.getByRole("button", {
    name: `Edit ${title}`,
    exact: true,
  });
  const days = page.locator(".calendar-days > .calendar-day");
  const target = days.first();
  const move = page.waitForRequest(
    (req) => req.method() === "PUT" && req.url().includes("/api/tasks/1"),
  );
  await source.dragTo(target, { targetPosition: { x: 15, y: 15 } });
  const moved = await move;
  expect(moved.postDataJSON().dueDate).toBeTruthy();
  await target.locator(".calendar-day-number").click();
  await expect(
    page.locator(".calendar-agenda").getByText(title, { exact: true }),
  ).toBeVisible();
  const copyTarget = days.nth(1);
  const copy = page.waitForRequest(
    (req) =>
      req.method() === "POST" && new URL(req.url()).pathname === "/api/tasks",
  );
  await page.keyboard.down("Control");
  await source.dragTo(copyTarget, { targetPosition: { x: 15, y: 15 } });
  await page.keyboard.up("Control");
  const copied = await copy;
  expect(copied.postDataJSON().title).toBe(title);
  await expect(
    board.getByRole("button", { name: `Edit ${title}`, exact: true }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Detailed", exact: true }).click();
  await expect(
    board.getByRole("button", { name: `Edit ${title}`, exact: true }),
  ).toHaveCount(2);
});
