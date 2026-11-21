import { test, expect, type Page } from "@playwright/test";
import { installV2Fixture } from "./frontend-v2.fixture";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

async function material(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        fill: style.backgroundColor,
        gradient: style.backgroundImage,
        blur: style.backdropFilter,
        shadow: style.boxShadow,
        radius: style.borderRadius,
        border: style.borderTopColor,
      };
    });
}

for (const theme of ["light", "dark"] as const) {
  test(`Calendar and Agents share Dashboard glass in ${theme}`, async ({
    page,
  }) => {
    await agentWorkspaceFixture(page);
    await page.addInitScript(
      (value) => localStorage.setItem("orbit-theme", value),
      theme,
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/v2/dashboard");
    await expect(page.locator(".v2-workspace-panel")).toBeVisible();
    const reference = await material(page, ".v2-workspace-panel");
    for (const [route, selector] of [
      ["calendar", ".v2-calendar-panel"],
      ["agents", ".v2-agent-history"],
    ]) {
      await page.goto(`/v2/${route}`);
      await expect(page.locator(selector)).toBeVisible();
      expect(await material(page, selector)).toEqual(reference);
      await page.screenshot({
        path: `/tmp/v2-glass-review/${route}-${theme}.png`,
        fullPage: true,
      });
    }
  });
}

test("Calendar remains usable on mobile after material alignment", async ({
  page,
}) => {
  await installV2Fixture(page, { preferredVersion: "v2" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v2/calendar");
  await expect(page.locator(".v2-calendar-panel")).toBeVisible();
  await page.getByRole("button", { name: "Month", exact: true }).click();
  const day = page.locator(
    '.v2-calendar-cell[data-today="true"] .v2-calendar-day',
  );
  await day.click();
  await expect(page.locator(".v2-calendar-day-panel")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/v2-glass-review/calendar-mobile.png",
    fullPage: true,
  });
});

test("Agents conversation and composer remain usable on mobile", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v2/agents");
  await expect(page.locator(".v2-agent-center")).toBeVisible();
  const composer = page.locator(".v2-agent-center textarea");
  await expect(composer).toBeVisible();
  await composer.fill("Review my plan for today");
  await expect(composer).toHaveValue("Review my plan for today");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/v2-glass-review/agents-mobile.png",
    fullPage: true,
  });
});

test("Skills tabs and actions align in one row on desktop and wrap on mobile", async ({
  page,
}) => {
  await installV2Fixture(page, { preferredVersion: "v2" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/agents/skills");
  const header = page.locator(".v2-skills-header");
  const tabs = header.locator(".v2-agent-tabs");
  const actions = header.locator(".v2-agents-heading-actions");
  await expect(tabs).toBeVisible();
  const tabBox = (await tabs.boundingBox())!;
  const actionBox = (await actions.boundingBox())!;
  const headerBox = (await header.boundingBox())!;
  expect(Math.abs(tabBox.x - headerBox.x)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(actionBox.x + actionBox.width - headerBox.x - headerBox.width),
  ).toBeLessThanOrEqual(1);

  expect(
    Math.abs(tabBox.y + tabBox.height / 2 - actionBox.y - actionBox.height / 2),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: "/tmp/v2-glass-review/skills-header-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    header.getByRole("button", { name: "Add from template", exact: true }),
  ).toBeVisible();
  await expect(
    header.getByRole("link", { name: "Create skill", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
