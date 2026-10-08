import { test, expect } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";
import type { Page } from "@playwright/test";
async function setup(page: Page, empty = false) {
  await dashboardFixture(page);
  let categories = empty
    ? []
    : [
        {
          _id: "work",
          name: "Work",
          description:
            "Big ideas, daily priorities, and the work that moves you forward.",
        },
        {
          _id: "personal",
          name: "Personal",
          description:
            "Make time for the people, plans, and little things that matter.",
        },
        {
          _id: "health",
          name: "Health",
          description: "Build better habits. Take care of your future self.",
        },
        {
          _id: "learning",
          name: "Learning",
          description: "Follow your curiosity, one new discovery at a time.",
        },
        { _id: "uncategorized", name: "Uncategorized", description: "" },
      ];
  await page.route("**/api/categories**", async (route) => {
    if (route.request().method() === "POST") {
      const item = { ...route.request().postDataJSON(), _id: "new-category" };
      categories.push(item);
      return route.fulfill({ json: item });
    }
    if (route.request().method() === "DELETE")
      categories = categories.filter(
        (c) => !route.request().url().endsWith(c._id),
      );
    await route.fulfill({ json: categories });
  });
  await page.route("**/api/tasks/category/**", (route) =>
    route.fulfill({
      json: {
        data: [],
        pageInfo: { pageNo: 1, pageSize: 10, totalCount: 0, totalPage: 0 },
      },
    }),
  );
  await page.goto("/categories");
  await expect(
    page.getByRole("heading", { name: "Categories", exact: true }),
  ).toBeVisible();
}

test("browse, search, sort, filter, create and inspect categories", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await setup(page);
  await page.screenshot({
    path: "artifacts/categories-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("textbox", { name: "Search categories" }).fill("health");
  await expect(page.locator(".category-card")).toHaveCount(1);
  await page.getByRole("textbox", { name: "Search categories" }).fill("zzzz");
  await expect(
    page.getByRole("heading", { name: "No categories found" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/categories-no-results.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page
    .getByRole("button", { name: "With active tasks", exact: true })
    .click();
  await expect(page.locator(".category-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Empty", exact: true }).click();
  await expect(page.locator(".category-card")).toHaveCount(4);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByLabel("Sort groups").selectOption("tasks");
  await expect(
    page.locator(".category-card").first().getByRole("heading"),
  ).toHaveText("Work");
  await page.getByRole("button", { name: "Work", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close category details" }).click();
  await page.getByRole("button", { name: "Add Category", exact: true }).click();
  await page.getByLabel("Category Name").fill("Creative practice");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A little space to make something new.");
  await page.screenshot({
    path: "artifacts/categories-create.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add Category", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Creative practice" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Projects 3" }).click();
  await expect(
    page.getByRole("heading", { name: "Projects", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Include completed projects").check();
  await page.getByRole("button", { name: /Categories 6/ }).click();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({
    path: "artifacts/categories-dark.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});

test("mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.screenshot({
    path: "artifacts/categories-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.screenshot({
    path: "artifacts/categories-mobile-viewport.png",
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Add Category", exact: true }).click();
  await expect(page.getByLabel("Category Name")).toBeFocused();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({
    path: "artifacts/categories-mobile-dark.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("first category empty state", async ({ page }) => {
  await setup(page, true);
  await expect(page.getByText("No categories to show")).toBeVisible();
  await page.screenshot({
    path: "artifacts/categories-empty.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("keyboard dialogs, quick completion, drag and deletion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1600 });
  await setup(page);
  const add = page.getByRole("button", { name: "Add Category", exact: true });
  await add.click();
  await expect(page.getByLabel("Category Name")).toBeFocused();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add Category", exact: true })
    .focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close add category dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(add).toBeFocused();
  await page.getByRole("button", { name: "Work", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const work = page
    .locator(".category-card")
    .filter({ has: page.getByRole("heading", { name: "Work", exact: true }) });
  await work
    .getByRole("button", {
      name: "Finish task Explore directions for the homepage",
      exact: true,
    })
    .click();
  await expect(work.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "29",
  );
  const personal = page.locator(".category-card").filter({
    has: page.getByRole("heading", { name: "Personal", exact: true }),
  });
  await work
    .getByRole("button", {
      name: "Open task Send the first round of design feedback",
      exact: true,
    })
    .dragTo(personal);
  await expect(personal.getByText("1 task", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Health", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Health", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Health", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Health", exact: true }),
  ).toHaveCount(0);
});

test("error state retries a failed request", async ({ page }) => {
  await dashboardFixture(page);
  let fail = true;
  await page.route("**/api/categories**", (route) =>
    route.fulfill(
      fail
        ? { status: 500, json: { message: "Temporarily unavailable" } }
        : { json: [] },
    ),
  );
  await page.goto("/categories");
  await expect(page.getByText("Unable to load this workspace")).toBeVisible({
    timeout: 15000,
  });
  fail = false;
  await page.getByRole("button", { name: "Try Again" }).click();
  await expect(page.getByText("No categories to show")).toBeVisible();
});
