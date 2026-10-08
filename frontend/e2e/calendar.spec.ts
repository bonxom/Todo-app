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
  await screenshot(page, "calendar-desktop");
  await page.getByRole("button", { name: "Next week" }).click();
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
  await screenshot(page, "calendar-month");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".calendar-day[aria-pressed=true]")).toHaveCount(1);
  await page.getByRole("button", { name: "Week", exact: true }).click();
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
  const target = page.locator(".calendar-day[aria-pressed=false]").first();
  const request = page.waitForRequest(
    (req) => req.method() === "PUT" && req.url().includes("/api/tasks/"),
  );
  // Bring both drag endpoints into view after completing a task in the agenda.
  await page.locator(".calendar-board").scrollIntoViewIfNeeded();
  await source.scrollIntoViewIfNeeded();
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
