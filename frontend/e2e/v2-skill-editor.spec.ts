import { expect, test } from "@playwright/test";
import path from "node:path";
import { installV2Fixture } from "./frontend-v2.fixture";

const REVIEW_DIR = path.resolve(
  import.meta.dirname,
  "../artifacts/skill-editor-review",
);

test.describe("V2 Skill Editor consistency and visual polish", () => {
  test("aligns header bar, two-column Liquid Glass layout, and Edit/Preview toggle in Ocean Light & Dark", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installV2Fixture(page, {
      preferredVersion: "v2",
      theme: "light",
      language: "en",
    });
    await page.addInitScript(() => {
      localStorage.setItem("orbit.v2-palette", "ocean");
    });

    await page.goto("/v2/agents/skills/new");
    await expect(page.getByTestId("v2-skill-editor")).toBeVisible();

    // Verify top header tabs and Save button sit on the same row
    const tabsBox = await page.locator(".v2-agent-tabs").boundingBox();
    const saveBox = await page
      .getByRole("button", { name: "Save skill" })
      .boundingBox();
    expect(tabsBox).not.toBeNull();
    expect(saveBox).not.toBeNull();
    expect(Math.abs(tabsBox!.y - saveBox!.y)).toBeLessThan(12);

    // Verify enable switch has proper label and accessible state
    const enableSwitch = page.getByRole("switch", { name: "Enable skill" });
    await expect(enableSwitch).toBeVisible();
    await expect(enableSwitch).toHaveAttribute("aria-checked", "true");

    // Verify two-column layout on desktop
    const panels = page.locator(
      '[data-testid="v2-skill-editor"] section.v2-glass-panel',
    );
    await expect(panels).toHaveCount(2);
    const leftBox = await panels.nth(0).boundingBox();
    const rightBox = await panels.nth(1).boundingBox();
    expect(leftBox).not.toBeNull();
    expect(rightBox).not.toBeNull();
    expect(rightBox!.x).toBeGreaterThan(leftBox!.x + leftBox!.width - 1);

    // Verify Instructions textarea has generous height (not crushed to 44px)
    const instructionsBox = await page.getByLabel("Instructions").boundingBox();
    expect(instructionsBox).not.toBeNull();
    expect(instructionsBox!.height).toBeGreaterThanOrEqual(360);

    await page.screenshot({
      path: path.join(REVIEW_DIR, "skill-editor-ocean-light.png"),
      fullPage: true,
    });

    // Fill fields and test Preview mode
    await page.getByLabel("Skill name").fill("IELTS Writing Coach");
    await page
      .getByLabel("Description")
      .fill(
        "Use when reviewing essays or providing band-score feedback on writing tasks.",
      );
    await page
      .getByLabel("Instructions")
      .fill(
        "### Review checklist\n\n- Preserve the author's original intent.\n- Highlight 2 strengths and 3 high-impact improvements.\n- End with one short practice prompt.",
      );
    await expect(
      page.getByRole("button", { name: "Save skill" }),
    ).toBeEnabled();

    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page.getByText("Review checklist")).toBeVisible();
    await page.mouse.move(10, 10);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(REVIEW_DIR, "skill-editor-ocean-preview.png"),
      fullPage: true,
    });

    // Switch back to Edit & Dark mode
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("button", { name: /Switch to dark mode/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.mouse.move(10, 10);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(REVIEW_DIR, "skill-editor-ocean-dark.png"),
      fullPage: true,
    });
  });

  test("Vietnamese mobile (390px) layout has zero horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installV2Fixture(page, {
      preferredVersion: "v2",
      theme: "light",
      language: "vi",
    });
    await page.addInitScript(() => {
      localStorage.setItem("orbit.v2-palette", "ocean");
    });

    await page.goto("/v2/agents/skills/new");
    await expect(page.getByTestId("v2-skill-editor")).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: path.join(REVIEW_DIR, "skill-editor-vi-mobile.png"),
      fullPage: true,
    });
  });
});
