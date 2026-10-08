import { test, expect, type Page } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";

async function fixture(page: Page, empty = false) {
  await dashboardFixture(page, empty);
  const dailyStats = Array.from({ length: 365 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (364 - i));
    const count = i % 7 === 0 ? 0 : (i * 7) % 9;
    return {
      date: date.toISOString().slice(0, 10),
      completedTasks: count,
      givenUpTasks: i % 13 === 0 ? 1 : 0,
      completedOfEachCategory: [
        { categoryName: "Work", count: Math.ceil(count * 0.6) },
        { categoryName: "Personal", count: Math.floor(count * 0.4) },
      ],
    };
  });
  await page.route("**/api/stats/**", (route) =>
    route.fulfill({
      json: route.request().url().includes("completed-tasks")
        ? [
            {
              _id: "finished",
              title: "Bring the new homepage to life",
              categoryId: { name: "Work" },
              projectId: { name: "Website refresh" },
            },
          ]
        : {
            totalTasks: empty ? 0 : 128,
            completedTasks: empty ? 0 : 96,
            inProgressTasks: empty ? 0 : 18,
            pendingTasks: empty ? 0 : 10,
            givenUpTasks: empty ? 0 : 4,
            dailyStats: empty ? [] : dailyStats,
          },
    }),
  );
}

test("statistics ranges, calendar details, themes, and mobile layout", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/statistics");
  await expect(
    page.getByRole("heading", { name: "Statistics", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("75% complete")).toBeVisible();
  await page.waitForTimeout(1100); // Allow the chart entrance animation to finish.
  await page.screenshot({
    path: "/tmp/statistics-review/desktop.png",
    fullPage: true,
  });
  for (const days of [7, 14, 90, 30]) {
    const button = page.getByRole("button", {
      name: `${days} days`,
      exact: true,
    });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  await page.locator('input[name="stats_range_start"]').fill("2026-01-01");
  await expect(
    page.getByRole("button", { name: "30 days", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.locator(".statistics-heat-cell:not(:disabled)").first().click();
  await expect(page.getByText("Bring the new homepage to life")).toBeVisible();
  await page.getByRole("button", { name: "Close day details" }).click();
  await expect(page.getByText("Bring the new homepage to life")).toHaveCount(0);
  await page.getByRole("button", { name: "30 days", exact: true }).click();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1100);
  await page.screenshot({
    path: "/tmp/statistics-review/dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1100);
  await page.screenshot({
    path: "/tmp/statistics-review/mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "View tasks" }).click();
  await expect(page).toHaveURL(/\/todos/);
});

test("empty statistics remains useful", async ({ page }) => {
  await fixture(page, true);
  await page.goto("/statistics");
  await expect(page.getByText("0% complete")).toBeVisible();
  await expect(
    page.getByText("Your first completed task is the start of something good."),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/statistics-review/empty.png",
    fullPage: true,
  });
});

test("statistics and day-detail failures can be retried", async ({ page }) => {
  await fixture(page);
  let failing = true;
  await page.route("**/api/stats/", (route) =>
    failing
      ? route.fulfill({
          status: 500,
          json: { message: "Statistics unavailable" },
        })
      : route.fallback(),
  );
  await page.goto("/statistics");
  await expect(page.getByText("Unable to load statistics")).toBeVisible();
  failing = false;
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await expect(page.getByText("75% complete")).toBeVisible();
  let dayFailing = true;
  await page.route("**/api/stats/completed-tasks?*", (route) =>
    dayFailing
      ? route.fulfill({ status: 500, json: { message: "Day unavailable" } })
      : route.fallback(),
  );
  const day = page
    .locator("button.statistics-heat-cell:not(:disabled)")
    .first();
  await day.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  dayFailing = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("Bring the new homepage to life")).toBeVisible();
});
