import { test, expect } from "@playwright/test";
import { notificationsFixture } from "./notifications.fixture";
test.beforeEach(async ({ page }) => {
  await notificationsFixture(page);
});
test("bell, history, pagination, read all and missing task", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /notifications/i }).click();
  await expect(
    page.getByRole("dialog", { name: "Notifications" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View all notifications" }).click();
  await expect(page).toHaveURL(/\/notifications/);
  await page.getByRole("button", { name: "Page 2", exact: true }).click();
  await expect(
    page.getByText("Deadline report 21", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open task: Deadline report 21" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "This task is no longer available",
  );
  await page.goto("/notifications");
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByTestId("notification-badge")).toHaveCount(0);
  await page.getByRole("button", { name: "Unread", exact: true }).click();
  await expect(page.getByText("You're all caught up")).toBeVisible();
});
test("mobile keyboard and layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  const trigger = page.getByRole("button", { name: /notifications/i });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Notifications" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

for (const language of ["en", "vi"]) {
  for (const theme of ["light", "dark"]) {
    test(`visual ${language} ${theme}`, async ({ page }, testInfo) => {
      await page.addInitScript(
        ({ language, theme }) => {
          localStorage.setItem("orbit.language", language);
          localStorage.setItem("orbit-theme", theme);
        },
        { language, theme },
      );
      await page.setViewportSize({
        width: language === "vi" ? 390 : 1440,
        height: 900,
      });
      await page.goto("/notifications");
      await expect(
        page.getByRole("heading", {
          name: language === "vi" ? "Thông báo" : "Notifications",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Deadline report 1", { exact: true }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`history-${language}-${theme}.png`),
        fullPage: true,
      });
      await page
        .getByRole("button", {
          name: language === "vi" ? /Thông báo,/ : /Notifications,/,
        })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`bell-${language}-${theme}.png`),
      });
    });
  }
}

test("mobile topbar controls fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/notifications");
  await expect(
    page.getByRole("heading", { name: "Notifications", exact: true }),
  ).toBeVisible();
  const bounds = await page
    .locator(".ui-topbar button:visible")
    .evaluateAll((elements) =>
      elements.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right };
      }),
    );
  bounds.sort((a, b) => a.left - b.left);
  for (let i = 1; i < bounds.length; i++)
    expect(bounds[i - 1].right).toBeLessThanOrEqual(bounds[i].left + 1);
  for (const bound of bounds) {
    expect(bound.left).toBeGreaterThanOrEqual(0);
    expect(bound.right).toBeLessThanOrEqual(390);
  }
});

test("popup mark-one, mark-all, cancel and delete entire history", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /notifications/i }).click();
  await page
    .getByRole("button", {
      name: "Mark as read: Deadline report 1",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("notification-badge")).toHaveText("20");
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByTestId("notification-badge")).toHaveCount(0);
  await page.getByRole("button", { name: "Delete all notifications" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByText("Deadline report 1", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete all notifications" }).click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByText("You're all caught up")).toBeVisible();
  await page.getByRole("link", { name: "View all notifications" }).click();
  await expect(page.getByText("You're all caught up")).toBeVisible();
});

test("history delete resets page and works with an empty unread filter", async ({
  page,
}) => {
  await page.goto("/notifications");
  await page.getByRole("button", { name: "Page 2", exact: true }).click();
  await page.getByRole("button", { name: "Delete all notifications" }).click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByText("You're all caught up")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Back to first page" }),
  ).toHaveCount(0);
});
test("read history can be deleted from empty unread view on mobile", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/notifications");
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await page.getByRole("button", { name: "Unread", exact: true }).click();
  await expect(page.getByText("You're all caught up")).toBeVisible();
  await page.getByRole("button", { name: "Delete all notifications" }).click();
  await page.screenshot({
    path: testInfo.outputPath("delete-confirmation-mobile.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Delete all notifications" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Delete all notifications" }).click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.getByText("You're all caught up")).toBeVisible();
});
