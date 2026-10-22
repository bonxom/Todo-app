import { test, expect } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";

test("task status effects remain visible for completion, restore and confirmed give up", async ({ page }) => {
  await dashboardFixture(page);
  await page.route("**/api/ai/conversations**", (route) => route.fulfill({ json: {
    data: route.request().url().endsWith("/latest") ? null : [],
  } }));
  await page.goto("/dashboard");
  const title = "Explore directions for the homepage";
  const card = page.locator('[data-task-id="1"]');
  const expectEffect = async (color: string) => {
    await expect.poll(() => card.evaluate((node, color) => node.getAnimations().some((animation) =>
      animation.playState === "running" &&
      (animation.effect as KeyframeEffect).getKeyframes().some((frame) => String(frame.boxShadow).includes(color)),
    ), color)).toBe(true);
    // Inspect the actual painted frame in Chromium, not an animate() mock.
    await card.evaluate((node) => { node.getAnimations().forEach((animation) => { animation.pause(); animation.currentTime = 250; }); });
    await expect(card).toHaveCSS("box-shadow", `rgb(${color}) 0px 0px 0px 2px inset`);
    await card.evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
  };
  await page.getByRole("button", { name: `Mark ${title} as completed` }).click();
  await expectEffect("34, 197, 94");
  await page.getByRole("button", { name: `Restore ${title} to in-progress` }).click();
  await expectEffect("59, 130, 246");
  await page.getByRole("button", { name: `Actions for ${title}` }).click();
  await page.getByRole("button", { name: "Give up task", exact: true }).click();
  await page.getByRole("button", { name: "Give Up", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expectEffect("239, 68, 68");
});

test("given up remains red before leaving a filtered task list", async ({ page }) => {
  await dashboardFixture(page);
  await page.route("**/api/ai/conversations**", (route) => route.fulfill({ json: {
    data: route.request().url().endsWith("/latest") ? null : [],
  } }));
  await page.goto("/dashboard");
  await page.locator(".ui-global-task-filter__trigger").click();
  await page.getByRole("menuitemcheckbox", { name: "In Progress" }).click();
  await page.keyboard.press("Escape");
  const card = page.locator('[data-task-id="1"]');
  await card.getByRole("button", { name: /Actions for/ }).click();
  await page.getByRole("button", { name: "Give up task", exact: true }).click();
  await page.getByRole("button", { name: "Give Up", exact: true }).click();
  await expect(card).toHaveAttribute("data-status", "given-up");
  await expect.poll(() => card.evaluate((node) => node.getAnimations().some((animation) =>
    animation.playState === "running" &&
    (animation.effect as KeyframeEffect).getKeyframes().some((frame) => String(frame.boxShadow).includes("239, 68, 68")),
  ))).toBe(true);
  await expect(card).toHaveCount(0);
});
