import { test, expect, type Page } from "@playwright/test";
import { workspaceDetailsFixture } from "./workspace-details.fixture";

const screenshot = async (page: Page, name: string) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `artifacts/${name}.png`,
    fullPage: !name.includes("detail"),
    animations: "disabled",
  });
};

test("category detail uses complete totals, filters, pages and task actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { taskPages } = await workspaceDetailsFixture(page);
  await page.goto("/categories");
  const health = page.locator(".category-card").filter({
    has: page.getByRole("heading", { name: "Health", exact: true }),
  });
  await expect(health.getByText("13 of 30 completed")).toBeVisible();
  expect(taskPages).toContain(2);
  await page.getByRole("button", { name: "Health", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "43",
  );
  await expect(
    dialog.locator(".group-detail-summary").getByText("30", { exact: true }),
  ).toBeVisible();
  await screenshot(page, "category-detail-desktop");
  await dialog.getByRole("button", { name: "Next task page" }).click();
  await expect(dialog.getByRole("status")).toHaveText("9–16 of 30 tasks");
  await dialog
    .getByRole("button", { name: "Completed 13", exact: true })
    .click();
  await expect(dialog.getByRole("status")).toHaveText("1–8 of 13 tasks");
  await expect(dialog.getByText(/Overdue/)).toHaveCount(0);
  await dialog
    .getByRole("textbox", { name: "Search tasks in Health" })
    .fill("annual checkup");
  await expect(dialog.locator(".group-task-row")).toHaveCount(2);
  await dialog
    .getByRole("textbox", { name: "Search tasks in Health" })
    .fill("zzzz");
  await expect(
    dialog.getByRole("heading", { name: "No matching tasks" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Clear task filters" }).click();
  await dialog
    .getByRole("button", {
      name: "Complete Go for a swim · Week 2",
      exact: true,
    })
    .click();
  await expect(dialog.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "47",
  );
  await dialog
    .getByRole("button", {
      name: "Edit Stretch before bed · Week 2",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await dialog
    .getByRole("button", {
      name: "Delete Stretch before bed · Week 2",
      exact: true,
    })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(health.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "47",
  );
});

test("project cards, details, edits, creation, completion and restoration", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await workspaceDetailsFixture(page);
  await page.goto("/categories");
  await page.getByRole("button", { name: "Projects 4", exact: true }).click();
  await expect(page.locator(".project-collection-card")).toHaveCount(3);
  await screenshot(page, "projects-desktop");
  await page
    .getByRole("button", { name: "Website refresh", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await screenshot(page, "project-detail-desktop");
  await dialog.getByRole("button", { name: "Next task page" }).click();
  await expect(dialog.getByRole("status")).toHaveText("9–12 of 12 tasks");
  await dialog
    .getByRole("button", { name: "Edit project", exact: true })
    .click();
  await page.getByLabel("Project Name").fill("Website refresh 2.0");
  await page.getByRole("button", { name: "Save Project", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Website refresh 2.0" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Complete and hide Spring reset",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Spring reset", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Include completed projects").check();
  await page
    .getByRole("button", { name: "Restore Spring reset", exact: true })
    .click();
  await page.getByLabel("Include completed projects").uncheck();
  await expect(
    page.getByRole("heading", { name: "Spring reset", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add Project", exact: true }).click();
  await page.getByLabel("Project Name").fill("A new chapter");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add Project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A new chapter", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete A new chapter", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Delete Project" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A new chapter", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await screenshot(page, "projects-dark");
  await page
    .getByRole("button", { name: "Studio essentials", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A fresh start for Studio essentials" }),
  ).toBeVisible();
  await screenshot(page, "project-detail-empty-dark");
});

test("headings match dashboard and details work on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await workspaceDetailsFixture(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move((page.viewportSize()?.width || 1440) - 20, 10);
  await page.goto("/dashboard");
  await page.locator(".ui-workspace-heading .ui-page-title").click();
  await expect(page.locator(".ui-main-shell")).toHaveCSS("margin-left", page.viewportSize()?.width === 390 ? "0px" : "88px");
  const headingSize = await page
    .locator(".ui-workspace-heading .ui-page-title")
    .evaluate((el) => getComputedStyle(el).fontSize);
  const shellStyles = await page.locator(".ui-page-shell").evaluate((el) => {
    const css = getComputedStyle(el);
    return [
      css.width,
      css.gap,
      css.paddingTop,
      css.paddingBottom,
      css.marginLeft,
      css.marginRight,
    ];
  });
  const viewport = page.viewportSize()?.width === 390 ? "mobile" : "desktop";
  await screenshot(page, `shared-todos-${viewport}`);
  await page.goto("/categories");
  await expect(
    page.locator(".ui-workspace-heading .ui-page-title"),
  ).toBeVisible();
  expect(
    await page.locator(".ui-page-shell").evaluate((el) => {
      const css = getComputedStyle(el);
      return [
        css.width,
        css.gap,
        css.paddingTop,
        css.paddingBottom,
        css.marginLeft,
        css.marginRight,
      ];
    }),
  ).toEqual(shellStyles);
  await screenshot(page, `shared-categories-${viewport}`);
  await expect(page.locator(".ui-workspace-heading .ui-page-title")).toHaveCSS(
    "font-size",
    headingSize,
  );
  await page.getByRole("button", { name: "Health", exact: true }).click();
  await screenshot(page, "category-detail-mobile");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.getByRole("button", { name: "Completed 13", exact: true }).click();
  await page.getByRole("button", { name: "Next task page" }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "9–13 of 13 tasks",
  );
  await page.getByRole("button", { name: "Close category details" }).click();
  await page.getByRole("button", { name: "Projects 4", exact: true }).click();
  await screenshot(page, "projects-mobile");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page
    .getByRole("button", { name: "Website refresh", exact: true })
    .click();
  await screenshot(page, "project-detail-mobile-dark");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
});

test("task confirmations update details and preserve the underlying dialog", async ({
  page,
}) => {
  await workspaceDetailsFixture(page);
  await page.goto("/categories");
  await page.getByRole("button", { name: "Health", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Give up Go for a swim · Week 2",
      exact: true,
    })
    .click();
  const confirmation = page.getByRole("dialog", {
    name: "Give Up Task",
    exact: true,
  });
  await confirmation
    .getByRole("button", { name: "Give Up", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.getByRole("button", { name: "Given up 3", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete Go for a swim · Week 2", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Delete Task", exact: true })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(
    page.locator(".group-detail-summary").getByText("29", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Given up 2", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close category details" }).click();
  const health = page.locator(".category-card").filter({
    has: page.getByRole("heading", { name: "Health", exact: true }),
  });
  await expect(health.getByText("13 of 29 completed")).toBeVisible();
});

test("desktop headings match TodoPage for both collection views", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await workspaceDetailsFixture(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move((page.viewportSize()?.width || 1440) - 20, 10);
  await page.goto("/dashboard");
  await page.locator(".ui-workspace-heading .ui-page-title").click();
  await expect(page.locator(".ui-main-shell")).toHaveCSS("margin-left", page.viewportSize()?.width === 390 ? "0px" : "88px");
  const headingSize = await page
    .locator(".ui-workspace-heading .ui-page-title")
    .evaluate((el) => getComputedStyle(el).fontSize);
  const shellStyles = await page.locator(".ui-page-shell").evaluate((el) => {
    const css = getComputedStyle(el);
    return [
      css.width,
      css.gap,
      css.paddingTop,
      css.paddingBottom,
      css.marginLeft,
      css.marginRight,
    ];
  });
  const viewport = page.viewportSize()?.width === 390 ? "mobile" : "desktop";
  await screenshot(page, `shared-todos-${viewport}`);
  await page.goto("/categories");
  await expect(
    page.locator(".ui-workspace-heading .ui-page-title"),
  ).toBeVisible();
  expect(
    await page.locator(".ui-page-shell").evaluate((el) => {
      const css = getComputedStyle(el);
      return [
        css.width,
        css.gap,
        css.paddingTop,
        css.paddingBottom,
        css.marginLeft,
        css.marginRight,
      ];
    }),
  ).toEqual(shellStyles);
  await screenshot(page, `shared-categories-${viewport}`);
  await expect(page.locator(".ui-workspace-heading .ui-page-title")).toHaveCSS(
    "font-size",
    headingSize,
  );
  await page.getByRole("button", { name: "Projects 4", exact: true }).click();
  await expect(page.locator(".ui-workspace-heading .ui-page-title")).toHaveCSS(
    "font-size",
    headingSize,
  );
});
