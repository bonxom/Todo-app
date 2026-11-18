import { test, expect, type Page } from "@playwright/test";
import { installV2Fixture } from "./frontend-v2.fixture";

async function setupStatisticsRoute(page: Page, empty = false) {
  const today = new Date("2026-11-18T12:00:00Z");
  await page.clock.install({ time: today });

  const dailyStats = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (364 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const count = i % 5 === 0 ? 0 : (i % 7) + 1;
    return {
      date: dateStr,
      completedTasks: count,
      givenUpTasks: i % 11 === 0 ? 1 : 0,
      completedOfEachCategory: [
        {
          categoryId: "c1",
          categoryName: "Engineering",
          count: Math.ceil(count * 0.7),
        },
        {
          categoryId: "c2",
          categoryName: "Product Design",
          count: Math.floor(count * 0.3),
        },
      ],
      givenUpOfEachCategory: [],
    };
  });

  await page.route("**/api/stats/**", (route) => {
    const url = route.request().url();
    if (url.includes("completed-tasks")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            _id: "task-completed-1",
            title: "Implement Liquid Glass Statistics Page",
            categoryId: { _id: "c1", name: "Engineering" },
            projectId: { _id: "p1", name: "Orbit V2 Core" },
            status: "completed",
            priority: "High",
            startDate: "2026-11-18",
            completedAt: "2026-11-18T11:00:00Z",
          },
        ]),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        totalTasks: empty ? 0 : 128,
        completedTasks: empty ? 0 : 96,
        inProgressTasks: empty ? 0 : 18,
        pendingTasks: empty ? 0 : 10,
        givenUpTasks: empty ? 0 : 4,
        dailyStats: empty ? [] : dailyStats,
      }),
    });
  });
}

test.describe("V2 Statistics - Liquid Glass", () => {
  test("AC01: authenticated deep link, sidebar, and topbar resolve Statistics", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
      preferredVersion: "v2",
    });
    await setupStatisticsRoute(page);

    await page.goto("/v2/statistics");

    // Header and main heading
    await expect(
      page.getByRole("heading", { name: "Statistics", exact: true }),
    ).toBeVisible();

    // Sidebar active item
    const sidebarStatsLink = page.getByRole("link", { name: "Statistics" });
    await expect(sidebarStatsLink).toBeVisible();
    await expect(sidebarStatsLink).toHaveAttribute("data-active", "true");

    // Topbar section title
    await expect(page.locator(".v2-topbar")).toContainText("Statistics");
  });

  test("AC01: guest redirect to /login", async ({ page }) => {
    await installV2Fixture(page, { authenticated: false });

    await page.goto("/v2/statistics");
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
  });

  test("AC02: version switching maps exact statistics routes in both directions", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
      preferredVersion: "v2",
    });
    await setupStatisticsRoute(page);

    // Deep link V2 statistics
    await page.goto("/v2/statistics");
    await expect(
      page.getByRole("heading", { name: "Statistics", exact: true }),
    ).toBeVisible();

    // Switch to V1
    const backToV1Btn = page.getByRole("button", { name: "Back to V1" });
    await expect(backToV1Btn).toBeVisible();
    await backToV1Btn.click();
    await expect(page).toHaveURL(/\/statistics$/);

    // Switch back to V2
    const tryV2Btn = page.getByRole("button", { name: "Try V2" });
    await expect(tryV2Btn).toBeVisible();
    await tryV2Btn.click();
    await expect(page).toHaveURL(/\/v2\/statistics$/);
  });

  test("AC03, AC04, AC05: Overview 75%, Trend presets, and custom range interactions", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
      preferredVersion: "v2",
    });
    await setupStatisticsRoute(page);

    await page.goto("/v2/statistics");

    // Overview 75%
    const progressbar = page.getByRole("progressbar");
    await expect(progressbar).toHaveAttribute("aria-valuenow", "75");
    await expect(page.getByText("75%", { exact: true })).toBeVisible();

    // Presets
    const preset30 = page.getByRole("button", { name: "30 days", exact: true });
    await expect(preset30).toHaveAttribute("aria-pressed", "true");

    const preset7 = page.getByRole("button", { name: "7 days", exact: true });
    await preset7.click();
    await expect(preset7).toHaveAttribute("aria-pressed", "true");
    await expect(preset30).toHaveAttribute("aria-pressed", "false");

    // Invalid range shows inline alert and keeps valid chart
    const fromInput = page.getByLabel("From");
    await fromInput.fill("2026-12-01"); // future date
    await expect(page.getByRole("alert")).toBeVisible();

    // Click 14 days clears alert
    const preset14 = page.getByRole("button", { name: "14 days", exact: true });
    await preset14.click();
    await expect(preset14).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("alert")).not.toBeVisible();

    // Overview completion rate remains 75%
    await expect(progressbar).toHaveAttribute("aria-valuenow", "75");
  });

  test("AC06, AC07: Heatmap selection, task details, and focus restoration", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
      preferredVersion: "v2",
    });
    await setupStatisticsRoute(page);

    await page.goto("/v2/statistics");

    // Find in-range heatmap buttons
    const cells = page.locator(".v2-statistics-heatmap-cell:not(:disabled)");
    await expect(cells).toHaveCount(365);

    // Select the last cell (today)
    const lastCell = cells.last();
    await lastCell.click();
    await expect(lastCell).toHaveAttribute("aria-pressed", "true");

    // Details panel should appear with task details
    await expect(
      page.getByText("Implement Liquid Glass Statistics Page"),
    ).toBeVisible();
    await expect(page.getByText("Engineering").first()).toBeVisible();
    await expect(page.getByText("Orbit V2 Core").first()).toBeVisible();

    await page.screenshot({
      path: "/tmp/v2-statistics/desktop-day-details.png",
      fullPage: true,
    });

    // Close details
    const closeBtn = page.getByRole("button", { name: "Close day details" });
    await closeBtn.click();
    await expect(
      page.getByText("Implement Liquid Glass Statistics Page"),
    ).not.toBeVisible();

    // Focus restored to the cell
    await expect(lastCell).toBeFocused();
  });

  test("AC08, AC09: Zero data empty state", async ({ page }) => {
    await installV2Fixture(page, {
      authenticated: true,
      preferredVersion: "v2",
      scenario: "empty",
    });
    await setupStatisticsRoute(page, true);

    await page.goto("/v2/statistics");

    const progressbar = page.getByRole("progressbar");
    await expect(progressbar).toHaveAttribute("aria-valuenow", "0");
    await expect(page.getByText("0%")).toBeVisible();
    await expect(page.getByText("No recorded daily activity")).toBeVisible();
  });

  test("AC10: Responsiveness, no document overflow, themes, locales, and screenshots", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
      preferredVersion: "v2",
    });
    await setupStatisticsRoute(page);

    const viewports = [
      { width: 1440, height: 900, name: "desktop" },
      { width: 768, height: 1024, name: "tablet" },
      { width: 390, height: 844, name: "mobile-390" },
      { width: 360, height: 800, name: "mobile-360" },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/v2/statistics");
      await page.waitForLoadState("networkidle");

      // Assert document has no horizontal overflow
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(hasOverflow).toBe(false);

      if (vp.name === "desktop" || vp.name === "mobile-390") {
        // Light screenshot
        await page.screenshot({
          path: `/tmp/v2-statistics/${vp.name}-light.png`,
          fullPage: true,
        });

        // Switch to dark theme
        const themeBtn = page.getByRole("button", {
          name: /switch to dark mode|dark/i,
        });
        if (await themeBtn.isVisible()) {
          await themeBtn.click();
          await page.waitForTimeout(200);
          await page.screenshot({
            path: `/tmp/v2-statistics/${vp.name}-dark.png`,
            fullPage: true,
          });
          // Restore light theme
          const lightBtn = page.getByRole("button", {
            name: /switch to light mode|light/i,
          });
          if (await lightBtn.isVisible()) {
            await lightBtn.click();
            await page.waitForTimeout(100);
          }
        }
      }
    }

    // Language switch test (VI)
    await page.setViewportSize({ width: 1440, height: 900 });
    const langBtn = page.getByRole("button", { name: /language|ngôn ngữ/i });
    if (await langBtn.isVisible()) {
      await langBtn.click();
      await expect(
        page.getByRole("heading", { name: "Thống kê", exact: true }),
      ).toBeVisible();
    }
  });
});

test("review: localized calendar labels and minimal page header", async ({
  page,
}) => {
  await installV2Fixture(page, {
    authenticated: true,
    preferredVersion: "v2",
    language: "vi",
  });
  await setupStatisticsRoute(page);
  await page.goto("/v2/statistics");
  await expect(
    page.getByRole("heading", { name: "Thống kê", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".v2-statistics-heat-month-label")
      .filter({ hasText: /^Jan$/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Xem công việc" })).toHaveCount(
    0,
  );
  await expect(page.locator(".v2-statistics-header")).toHaveCount(0);
});

test("review: long completed task metadata fits on mobile", async ({
  page,
}) => {
  await installV2Fixture(page, { authenticated: true, preferredVersion: "v2" });
  await setupStatisticsRoute(page);
  const title =
    "Review the complete statistics experience and all accessibility requirements before release";
  await page.route("**/api/stats/completed-tasks?*", (route) =>
    route.fulfill({
      json: [
        {
          _id: "long-task",
          title,
          categoryId: { name: "EngineeringAccessibility".repeat(4) },
          projectId: { name: "OrbitProductDesign".repeat(5) },
        },
      ],
    }),
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/v2/statistics");
  await page
    .locator(".v2-statistics-heatmap-cell:not(:disabled)")
    .last()
    .click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.screenshot({
    path: "/tmp/v2-statistics/mobile-long-reviewed.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const taskTitle = page.locator(".v2-statistics-task-title");
  expect(
    await taskTitle.evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
});

test("review: failed requests retry and rapid day changes keep the correct details", async ({
  page,
}) => {
  await installV2Fixture(page, { authenticated: true, preferredVersion: "v2" });
  await setupStatisticsRoute(page);
  let summaryFailed = true;
  await page.route("**/api/stats/", (route) =>
    summaryFailed
      ? route.fulfill({
          status: 500,
          json: { message: "Statistics temporarily unavailable" },
        })
      : route.fallback(),
  );
  await page.goto("/v2/statistics");
  await expect(page.getByRole("alert")).toContainText(
    "Statistics temporarily unavailable",
    { timeout: 15000 },
  );
  summaryFailed = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "75",
  );
  let detailsFailed = true;
  await page.route("**/api/stats/completed-tasks?*", async (route) => {
    if (detailsFailed)
      return route.fulfill({
        status: 500,
        json: { message: "Day temporarily unavailable" },
      });
    const date = new URL(route.request().url()).searchParams.get("date");
    return route.fulfill({
      json: { date, tasks: [{ _id: date, title: `Completed on ${date}` }] },
    });
  });
  const today = page.getByRole("button", { name: /^2026-11-18 / });
  await today.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toContainText(
    "Day temporarily unavailable",
    { timeout: 15000 },
  );
  detailsFailed = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByText("Completed on 2026-11-18", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^2026-11-17 / }).click();
  await expect(
    page.getByText("Completed on 2026-11-17", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Completed on 2026-11-18", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close day details" }).click();
  await expect(
    page.getByRole("button", { name: /^2026-11-17 / }),
  ).toBeFocused();
});

test("review: assistant dock, language errors, single day and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installV2Fixture(page, { authenticated: true, preferredVersion: "v2" });
  await setupStatisticsRoute(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/statistics");
  await expect(page.getByRole("progressbar")).toBeVisible();
  await page.getByLabel("From", { exact: true }).fill("2026-11-18");
  await expect(page.locator(".v2-statistics-trend-summary")).toContainText(
    "Nov 18, 2026 to Nov 18, 2026",
  );
  await page.getByLabel("From", { exact: true }).fill("");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Vui lòng nhập cả ngày bắt đầu và kết thúc.",
  );
  await page.getByRole("button", { name: "7 ngày", exact: true }).click();
  await page.getByRole("button", { name: /trợ lý/i }).click();
  await page.getByRole("button", { name: /ghim.*bên|dock chat/i }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/v2-statistics/desktop-vi-docked.png",
    fullPage: true,
  });
});

test("review: glass material matches Dashboard in both themes", async ({
  page,
}) => {
  await installV2Fixture(page, { authenticated: true, preferredVersion: "v2" });
  await setupStatisticsRoute(page);
  for (const theme of ["light", "dark"] as const) {
    await page.goto("/v2/dashboard");
    await expect(page.locator(".v2-summary-item").first()).toBeVisible();
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    const material = async (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => {
          const style = getComputedStyle(el);
          return {
            background: style.backgroundImage,
            blur: style.backdropFilter,
            shadow: style.boxShadow,
            radius: style.borderRadius,
            border: style.borderTopColor,
          };
        });
    const summary = await material(".v2-summary-item");
    const panel = await material(".v2-workspace-panel");
    await page.getByRole("link", { name: "Statistics", exact: true }).click();
    await expect(page.getByRole("progressbar")).toBeVisible();
    expect(await material(".v2-statistics-metric-card")).toEqual(summary);
    expect(await material(".v2-statistics-trend-card")).toEqual(panel);
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: `/tmp/v2-statistics/material-${theme}.png`,
      fullPage: true,
    });
  }
});
