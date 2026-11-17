import { test, expect } from "@playwright/test";
import { installV2Fixture } from "./frontend-v2.fixture";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

for (const theme of ["light", "dark"] as const) {
  test(`Mobile workspace stays compact and usable in ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installV2Fixture(page, {
      preferredVersion: "v2",
      language: "vi",
      theme,
    });
    await page.goto("/v2/dashboard");
    await expect(
      page.getByRole("button", { name: "Task Item 7", exact: true }),
    ).toBeVisible();
    expect(
      (await page.locator(".v2-topbar").boundingBox())!.height,
    ).toBeLessThanOrEqual(124);
    const row = page.getByRole("listitem").filter({
      has: page.getByRole("button", { name: "Task Item 7", exact: true }),
    });
    expect((await row.boundingBox())!.height).toBeLessThanOrEqual(165);
    await expect(
      row.getByRole("button", { name: "Bắt đầu", exact: true }),
    ).toHaveCSS("min-height", "44px");
    await page.screenshot({
      path: `test-results/v2-polish-dashboard-${theme}.png`,
      fullPage: true,
    });
  });
}

test("Small-screen calendar days use the whole cell and expose selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await installV2Fixture(page, { preferredVersion: "v2", language: "vi" });
  await page.goto("/v2/calendar");
  const today = page.locator(
    '.v2-calendar-cell[data-today="true"] .v2-calendar-day',
  );
  await expect(today).toHaveAttribute("aria-current", "date");
  const box = (await today.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  const cell = (await page
    .locator('.v2-calendar-cell[data-today="true"]')
    .boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(cell.width - 2);
  await today.click({ position: { x: box.width / 2, y: box.height - 4 } });
  await expect(today).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/v2-polish-calendar-mobile.png",
    fullPage: true,
  });
});

for (const route of ["dashboard", "calendar", "agents", "agents/skills"]) {
  test(`${route} opens directly into the workspace without promotional headings`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installV2Fixture(page, { preferredVersion: "v2" });
    await page.goto(`/v2/${route}`);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.locator(".v2-eyebrow, .v2-heading-description"),
    ).toHaveCount(0);
    await expect(page.locator("main h1")).toHaveClass("sr-only");
  });
}

test("Agent workspace keeps the conversation usable without a hero", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.goto("/v2/agents?conversation=conv-e2e-1");
  await page.waitForLoadState("networkidle");
  await expect(
    page
      .getByTestId("v2-agents-page")
      .getByText("I have prepared the plan and created the required tasks."),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/v2-polish-agents-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".v2-agent-center")).toBeVisible();
  await page
    .locator(".v2-topbar")
    .getByRole("button", { name: "Open assistant", exact: true })
    .click();
  await expect(
    page
      .locator(".v2-agent-center")
      .getByRole("textbox", { name: "Message", exact: true }),
  ).toBeFocused();
  await expect(page.getByTestId("v2-assistant-panel")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/v2-polish-agents-mobile.png",
    fullPage: true,
  });
});

test("Reduced transparency removes blur from calendar and agent surfaces", async ({
  page,
  context,
}) => {
  await installV2Fixture(page, { preferredVersion: "v2", theme: "dark" });
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
  });
  for (const route of ["calendar", "agents"]) {
    await page.goto(`/v2/${route}`);
    await expect(page.locator("main")).toBeVisible();
    for (const panel of await page
      .locator(".v2-topbar, .v2-agent-panel, .v2-calendar-nav, .v2-agent-tabs")
      .all()) {
      await expect(panel).toHaveCSS("backdrop-filter", "none");
      await expect(panel).toHaveCSS("background-image", "none");
    }
  }
});

test("Desktop assistant launcher leaves task actions unobstructed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installV2Fixture(page, { preferredVersion: "v2" });
  await page.goto("/v2/dashboard");
  await expect(
    page.getByRole("button", { name: "Task Item 4", exact: true }),
  ).toBeVisible();
  const launcher = (await page.locator(".v2-assistant-trigger").boundingBox())!;
  for (const action of await page
    .locator(".v2-task-row-actions button")
    .all()) {
    const box = (await action.boundingBox())!;
    const overlaps =
      launcher.x < box.x + box.width &&
      launcher.x + launcher.width > box.x &&
      launcher.y < box.y + box.height &&
      launcher.y + launcher.height > box.y;
    expect(overlaps).toBe(false);
  }
});
