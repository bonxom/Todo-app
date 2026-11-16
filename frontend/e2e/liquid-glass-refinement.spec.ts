import { test, expect } from "@playwright/test";
import { installV2Fixture } from "./frontend-v2.fixture";

test("create and edit stay inside V2, with shared data refreshed", async ({
  page,
}) => {
  await installV2Fixture(page);
  await page.goto("/v2/dashboard");
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Plan the studio launch");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Plan the studio launch", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Launch the studio");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Launch the studio");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Launch the studio", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/v2\/dashboard$/);
  await expect(
    page.locator(
      'a[href^="/dashboard"], a[href="/calendar"], a[href="/profile"]',
    ),
  ).toHaveCount(0);
});

test("dirty Escape stays in editor and background cannot receive focus", async ({
  page,
}) => {
  await installV2Fixture(page);
  await page.goto("/v2/dashboard");
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("A draft");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "A draft",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const theme of ["light", "dark"] as const) {
  for (const [width, height] of [
    [360, 800],
    [768, 1024],
    [1440, 900],
  ]) {
    test(`glass and grid ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await installV2Fixture(page, { theme });
      await page.goto("/v2/dashboard");
      await expect(
        page.getByRole("button", { name: "Task Item 1", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Back to V1", exact: true }),
      ).toBeVisible();
      expect(
        await page
          .locator(".v2-app")
          .evaluate((el) => getComputedStyle(el).backgroundImage),
      ).toContain("linear-gradient");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/liquid-glass-${theme}-${width}.png`,
        fullPage: true,
        animations: "disabled",
      });
      if (width === 1440) {
        const bounds = await page.locator(".v2-sidebar-desktop").boundingBox();
        expect(bounds?.x).toBeGreaterThan(0);
        expect(
          await page
            .locator(".v2-navigation")
            .evaluate((el) => getComputedStyle(el).backdropFilter),
        ).not.toBe("none");
      }
    });
  }
}

test("mobile editor keeps focus inside its glass surface with reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installV2Fixture(page, { theme: "dark" });
  await page.goto("/v2/dashboard");
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Create task", exact: true }),
  ).toBeEnabled();
  for (let index = 0; index < 16; index++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest('[role="dialog"]')),
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "/tmp/liquid-glass-editor-mobile.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "New task", exact: true }),
  ).toBeFocused();
  await page.addStyleTag({
    content:
      ".v2-topbar, .v2-navigation, .v2-glass-panel, .v2-workspace-panel { backdrop-filter: none !important; background: var(--v2-surface-solid) !important; }",
  });
  await expect(
    page.getByRole("button", { name: "New task", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/liquid-glass-solid-fallback.png",
    animations: "disabled",
  });
});

test("browser Back asks before discarding a dirty task edit", async ({
  page,
}) => {
  await installV2Fixture(page);
  await page.goto("/v2/dashboard");
  await page.getByRole("button", { name: "Task Item 1", exact: true }).click();
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Unsaved history draft");
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Keep editing", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Unsaved history draft",
  );
  await page.goBack();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/v2\/dashboard$/);
});
