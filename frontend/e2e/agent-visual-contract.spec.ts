import { expect, test } from "@playwright/test";
import { personalSkillsFixture } from "./personal-skills.fixture";

test("primary action, switch and modal use opaque theme surfaces", async ({
  page,
}) => {
  await personalSkillsFixture(page);
  await page.goto("/agent/skills/new");
  const save = page.getByRole("button", { name: "Lưu kỹ năng", exact: true });
  expect(
    await save.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  const toggle = page.getByRole("switch");
  expect(
    await toggle.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  await page
    .getByRole("button", { name: "Quay lại danh sách", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thêm từ mẫu", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Thư viện mẫu kỹ năng" });
  const surface = dialog.locator(".skill-gallery");
  await expect(surface).toBeVisible();
  expect(
    await surface.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
});

test("skill entries are keyboard links and primary actions remain visible at 390px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await personalSkillsFixture(page, {
    initialSkills: [
      {
        id: "one",
        name: "Writing",
        description: "Clear writing",
        instructions: "Be concise",
        enabled: true,
        version: 1,
        updatedAt: "2026-11-06T00:00:00Z",
      },
    ],
  });
  await page.goto("/agent/skills");
  await expect(page.getByRole("link", { name: /Writing/ })).toBeVisible();
  await page.getByRole("link", { name: /Writing/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel(/Tên kỹ năng/)).toHaveValue("Writing");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Agent topbar keeps only relevant controls on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await personalSkillsFixture(page);
  await page.goto("/agent/skills");
  await expect(page.locator(".ui-topbar-title")).toHaveText("Agent");
  await expect(page.getByRole("button", { name: "All tasks" })).toHaveCount(0);
  const bounds = await page.locator(".ui-topbar").boundingBox();
  expect(bounds?.x).toBe(0);
  expect(bounds?.width).toBe(390);
});

test("editor remains usable at 320px with save in the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await personalSkillsFixture(page);
  await page.goto("/agent/skills/new");
  await page.getByLabel(/Hướng dẫn chi tiết/).scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const save = await page
    .getByRole("button", { name: "Lưu kỹ năng", exact: true })
    .boundingBox();
  expect(save?.y).toBeGreaterThan(0);
  expect(save!.y + save!.height).toBeLessThanOrEqual(720);
});
