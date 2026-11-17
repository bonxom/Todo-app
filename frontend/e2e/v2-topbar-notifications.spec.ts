import { test, expect } from "@playwright/test";
import { notificationsFixture } from "./notifications.fixture";

for (const theme of ["light", "dark"]) {
  test(`Glass header and notifications in ${theme}`, async ({ page }) => {
    await notificationsFixture(page);
    await page.addInitScript(
      (theme) => localStorage.setItem("orbit-theme", theme),
      theme,
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/v2/dashboard");
    const header = page.locator(".v2-topbar");
    await expect(
      header.getByRole("button", { name: "Open assistant", exact: true }),
    ).toBeVisible();
    const bell = header.getByRole("button", { name: /Notifications,/ });
    await expect(bell).toBeVisible();
    await expect(page.getByTestId("notification-badge")).toHaveText("21");
    expect(
      await bell.evaluate((el) =>
        parseFloat(getComputedStyle(el).borderRadius),
      ),
    ).toBeGreaterThanOrEqual(22);
    await page.screenshot({ path: `/tmp/v2-topbar-controls-${theme}.png` });
    await header
      .getByRole("button", { name: "Open assistant", exact: true })
      .click();
    await expect(page.getByTestId("v2-assistant-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      header.getByRole("button", { name: "Open assistant", exact: true }),
    ).toBeFocused();
    await bell.click();
    await expect(
      page.getByRole("dialog", { name: "Notifications", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Mark as read: Deadline report 1",
        exact: true,
      })
      .click();
    await expect(page.getByTestId("notification-badge")).toHaveText("20");
    await page.screenshot({
      path: `/tmp/v2-topbar-notifications-${theme}.png`,
    });
    await page.getByRole("link", { name: "View all notifications" }).click();
    await expect(page).toHaveURL(/\/v2\/notifications$/);
    await page.screenshot({
      path: `/tmp/v2-notification-history-${theme}.png`,
    });
    await page.getByRole("button", { name: "Page 2", exact: true }).click();
    await expect(
      page.getByText("Deadline report 21", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Open task: Deadline report 21",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/v2\/dashboard\?taskId=/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });
}

test("V2 history reuses read, filter and confirmed delete behavior", async ({
  page,
}) => {
  await notificationsFixture(page);
  await page.goto("/v2/notifications");
  await page
    .getByRole("button", { name: "Mark all as read", exact: true })
    .click();
  await expect(page.getByTestId("notification-badge")).toHaveCount(0);
  await page.getByRole("button", { name: "Unread", exact: true }).click();
  await expect(page.getByText("You're all caught up")).toBeVisible();
  await page
    .getByRole("button", { name: "Delete all notifications", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete all notifications", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.getByText("You're all caught up")).toBeVisible();
});

for (const width of [320, 390, 768]) {
  test(`Header controls and notification popup fit ${width}px`, async ({
    page,
  }) => {
    await notificationsFixture(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/v2/dashboard");
    const header = page.locator(".v2-topbar");
    const bell = header.getByRole("button", { name: /Notifications,/ });
    await expect(bell).toBeVisible();
    const boxes = await header.locator("button:visible").evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }),
    );
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(width);
      expect(box.h).toBeGreaterThanOrEqual(44);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        expect(
          a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y,
        ).toBe(false);
      }
    await bell.click();
    const dialog = page.getByRole("dialog", {
      name: "Notifications",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await page.screenshot({
      path: `/tmp/v2-topbar-notifications-${width}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(bell).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("Notification list errors can be retried without leaving V2", async ({
  page,
}) => {
  await notificationsFixture(page);
  let failing = true;
  await page.route("**/api/notifications**", (route) => {
    const url = new URL(route.request().url());
    if (failing && url.pathname === "/api/notifications")
      return route.fulfill({ status: 503, json: { message: "Unavailable" } });
    return route.fallback();
  });
  await page.goto("/v2/dashboard");
  await page.getByRole("button", { name: /Notifications,/ }).click();
  const dialog = page.getByRole("dialog", {
    name: "Notifications",
    exact: true,
  });
  await expect(dialog.getByRole("alert")).toContainText(
    "Could not load notifications",
  );
  failing = false;
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    dialog.getByText("Deadline report 1", { exact: true }),
  ).toBeVisible();
});

test("Version switching keeps notification history and the V2 title", async ({
  page,
}) => {
  await notificationsFixture(page);
  await page.goto("/v2/notifications");
  await expect(page.locator(".v2-topbar")).toContainText("Notifications");
  await page.getByRole("button", { name: "Back to V1", exact: true }).click();
  await expect(page).toHaveURL(/(?<!v2)\/notifications$/);
  await page.getByRole("button", { name: "Try V2", exact: true }).click();
  await expect(page).toHaveURL(/\/v2\/notifications$/);
});

test("Vietnamese mobile history and badge stay in the V2 shell", async ({
  page,
}) => {
  await notificationsFixture(page);
  await page.addInitScript(() => {
    localStorage.setItem("orbit.language", "vi");
    localStorage.setItem("orbit-theme", "dark");
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v2/notifications");
  await expect(
    page.getByRole("heading", { name: "Thông báo", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("notification-badge")).toHaveText("21");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/v2-notification-history-mobile-vi.png",
    fullPage: true,
  });
});

test("Unread-count failures never show an invented badge", async ({ page }) => {
  await notificationsFixture(page);
  await page.route("**/api/notifications/unread-count", (route) =>
    route.fulfill({ status: 503, json: { message: "Unavailable" } }),
  );
  await page.goto("/v2/dashboard");
  const bell = page
    .locator(".v2-topbar")
    .getByRole("button", { name: "Notifications", exact: true });
  await expect(bell).toHaveAttribute("title", "Could not load notifications");
  await expect(page.getByTestId("notification-badge")).toHaveCount(0);
});
