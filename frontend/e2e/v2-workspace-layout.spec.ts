import { test, expect } from "@playwright/test";
import { installV2Fixture } from "./frontend-v2.fixture";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

for (const theme of ["light", "dark"] as const) {
  test(`Reference workspace proportions in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installV2Fixture(page, { preferredVersion: "v2", theme });
    await page.goto("/v2/dashboard");
    const sidebar = page.locator(".v2-sidebar-desktop");
    const bounds = (await sidebar.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(220);
    expect(bounds.width).toBeLessThanOrEqual(240);
    const link = sidebar.getByRole("link", { name: "Dashboard", exact: true });
    expect(
      await link.evaluate((el) => getComputedStyle(el).flexDirection),
    ).toBe("row");
    await expect(
      page
        .locator(".v2-task-toolbar")
        .getByRole("button", { name: "New task", exact: true }),
    ).toBeVisible();
    const row = page.getByRole("listitem").filter({
      has: page.getByRole("button", { name: "Task Item 7", exact: true }),
    });
    expect((await row.boundingBox())!.height).toBeLessThanOrEqual(88);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/v2-workspace-${theme}-desktop.png`,
      fullPage: true,
    });
  });
}

test("Mobile preserves navigation and the complete task workflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installV2Fixture(page, { preferredVersion: "v2", language: "vi" });
  await page.goto("/v2/dashboard");
  await page
    .getByRole("button", { name: "Tạo công việc", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Mở danh mục điều hướng" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Lịch", exact: true })
    .click();
  await expect(page).toHaveURL(/\/v2\/calendar$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const width of [320, 768, 1024, 1280]) {
  test(`Workspace remains contained at ${width}px with Vietnamese labels`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await installV2Fixture(page, { preferredVersion: "v2", language: "vi" });
    for (const route of ["dashboard", "calendar", "agents"]) {
      await page.goto(`/v2/${route}`);
      await page.waitForLoadState("networkidle");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/v2-workspace-${route}-${width}.png`,
        fullPage: true,
      });
    }
  });
}

test("Docked chat and long task names do not push actions out of the workspace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installV2Fixture(page, { preferredVersion: "v2" });
  await page.goto("/v2/dashboard");
  await page
    .locator(".v2-task-toolbar")
    .getByRole("button", { name: "New task", exact: true })
    .click();
  const title =
    "Review the complete workspace layout and confirm that long task names wrap without hiding controls";
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open assistant", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Dock chat to the side", exact: true })
    .click();
  await expect(page.getByTestId("v2-layout")).toHaveAttribute(
    "data-dock",
    "open",
  );
  await page.waitForTimeout(200); // Let the workspace margin transition settle before measuring.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const dock = (await page.getByTestId("v2-assistant-panel").boundingBox())!;
  const action = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: title, exact: true }) })
    .getByRole("button", { name: "Start", exact: true });
  const box = (await action.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(dock.x);
  await page.screenshot({
    path: "/tmp/v2-workspace-docked.png",
    fullPage: true,
  });
});

test("Editor covers the viewport and keeps its primary action reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installV2Fixture(page, { preferredVersion: "v2" });
  await page.goto("/v2/dashboard");
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const backdrop = (await page.locator(".v2-dialog-backdrop").boundingBox())!;
  expect(backdrop.x).toBe(0);
  expect(backdrop.width).toBe(1440);
  await page.screenshot({ path: "/tmp/v2-workspace-editor-desktop.png" });
  await page.setViewportSize({ width: 320, height: 700 });
  await page
    .getByRole("button", { name: "Create task", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Create task", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/v2-workspace-editor-mobile.png" });
});

for (const width of [1440, 390]) {
  test(`A user can send a message in the revised Agents workspace at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await agentWorkspaceFixture(page);
    await page.goto("/v2/agents?conversation=conv-e2e-1");
    const conversation = page.locator(".v2-agent-center");
    await expect(
      conversation.getByText(
        "I have prepared the plan and created the required tasks.",
      ),
    ).toBeVisible();
    const composer = conversation.getByRole("textbox", {
      name: "Message",
      exact: true,
    });
    await composer.fill("Review my workspace layout");
    await composer.press("Enter");
    await expect(
      conversation.getByText(
        "Phản hồi mẫu từ Orbit Agent cho: Review my workspace layout",
      ),
    ).toBeVisible();
    await expect(composer).toHaveValue("");
    await page.screenshot({
      path: `/tmp/v2-workspace-conversation-${width}.png`,
      fullPage: true,
    });
  });
}
