import { expect, test } from "@playwright/test";

test.describe("Orbit landing", () => {
  test("lets a visitor explore, complete tasks, add an idea, and create an account", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Everything to do.",
    );
    await page.getByRole("link", { name: "See Orbit in action" }).click();
    await expect(page).toHaveURL(/#preview$/);
    await page
      .getByRole("button", {
        name: "Complete: Give the homepage a little love",
      })
      .click();
    await expect(page.getByText("50%")).toBeVisible();
    await page.getByRole("button", { name: "To do", exact: true }).click();
    await expect(page.getByText("Give the homepage a little love")).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "Add task", exact: true }).click();
    await page
      .getByRole("textbox", { name: "New demo task" })
      .fill("Bring a new idea to life");
    await page.getByRole("textbox", { name: "New demo task" }).press("Enter");
    await expect(page.getByText("Bring a new idea to life")).toBeVisible();
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "The bigger picture." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await expect(page.getByText("October 2026")).toBeVisible();
    await page.getByRole("button", { name: /Today/ }).click();
    await expect(page.getByText("Bring a new idea to life")).toBeVisible();
    await page.getByRole("link", { name: "Create your workspace" }).click();
    await expect(page).toHaveURL(/\/register$/);
    expect(errors).toEqual([]);
  });

  test("supports mobile navigation, sign in, and keyboard dismissal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "Why Orbit" }).focus();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "How it works" }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  for (const width of [320, 390, 768, 1024, 1440]) {
    test(`fits a ${width}px screen in every demo view`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      for (const view of ["Today", "Projects", "Calendar"]) {
        await page.getByRole("button", { name: new RegExp(view) }).click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const main = page.locator(".demo-main");
        expect(
          await main.evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
      }
    });
  }

  test("reveals section elements from opposite sides as they enter the viewport", async ({
    page,
  }) => {
    await page.goto("/");
    const left = page.locator(".feature-card").nth(0);
    const right = page.locator(".feature-card").nth(1);
    await expect(left).toHaveCSS("opacity", "0");
    await expect(right).toHaveCSS("opacity", "0");
    expect(
      await left.evaluate((el) => parseFloat(getComputedStyle(el).translate)),
    ).toBeLessThan(0);
    expect(
      await right.evaluate((el) => parseFloat(getComputedStyle(el).translate)),
    ).toBeGreaterThan(0);
    await page.locator(".feature-grid").scrollIntoViewIfNeeded();
    await expect(left).toHaveCSS("opacity", "1");
    await expect(right).toHaveCSS("opacity", "1");
    await expect
      .poll(() =>
        right.evaluate((el) => parseFloat(getComputedStyle(el).translate)),
      )
      .toBe(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".closing-note")).toHaveCSS("opacity", "1");
  });

  test("uses the original logo and theme, and lets visitors pause motion", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".nav-inner .orbit-mark")).toBeVisible();
    await expect(page.locator(".landing-page")).toHaveCSS(
      "background-color",
      "rgb(246, 247, 249)",
    );
    await expect(page.locator(".path-outer")).toHaveCSS(
      "animation-play-state",
      "running",
    );
    await page.getByRole("button", { name: "Pause animations" }).click();
    await expect(page.locator(".path-outer")).toHaveCSS(
      "animation-play-state",
      "paused",
    );
    await page
      .getByRole("button", {
        name: "Complete: Give the homepage a little love",
      })
      .click();
    await expect(page.getByText("50%")).toBeVisible();
    await expect(page.locator(".demo-task").nth(1)).toHaveCSS("opacity", "1");
    await expect(
      page.locator(".demo-task").nth(1).locator(".task-checkbox svg"),
    ).toHaveCSS("animation-name", "none");
    await page.getByRole("button", { name: "Play animations" }).click();
    await expect(page.locator(".path-outer")).toHaveCSS(
      "animation-play-state",
      "running",
    );
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator(".workspace-window")).toHaveCSS(
      "background-color",
      "rgb(23, 33, 49)",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".path-outer")).toHaveCSS(
      "animation-name",
      "none",
    );
  });

  test("keeps the story visible with reduced motion and a dark app preference", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await page.goto("/");
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    await expect(
      page.getByRole("heading", { name: /life has enough moving parts/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /good things start/i }),
    ).toBeVisible();
    await expect(page.locator(".landing-page")).toHaveCSS(
      "background-color",
      "rgb(17, 24, 39)",
    );
  });
});
