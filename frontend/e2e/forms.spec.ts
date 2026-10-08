import { test, expect, type Page } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";

async function setup(page: Page, path = "/calendar") {
  await dashboardFixture(page);
  const categories = [{ _id: "work", name: "Work" }];
  const projects = [
    {
      _id: "website",
      name: "Website refresh",
      description: "A fresh home for our next chapter.",
      color: "#6C8060",
      status: "active",
    },
  ];
  await page.route("**/api/categories**", (route) => {
    if (route.request().method() === "POST") {
      const category = {
        ...route.request().postDataJSON(),
        _id: "new-category",
      };
      categories.push(category);
      return route.fulfill({ json: category });
    }
    return route.fulfill({ json: categories });
  });
  await page.route("**/api/projects**", (route) => {
    if (route.request().method() === "POST") {
      const project = {
        ...route.request().postDataJSON(),
        _id: "new-project",
        status: "active",
      };
      projects.push(project);
      return route.fulfill({ json: project });
    }
    return route.fulfill({ json: projects });
  });
  await page.goto(path);
}
async function shot(page: Page, name: string) {
  await page.screenshot({
    path: `artifacts/forms-${name}.png`,
    animations: "disabled",
  });
}

for (const route of ["/calendar", "/dashboard"]) {
  test(`shared task form and nested creation on ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await setup(page, route);
    await page.getByRole("button", { name: /^Add task$/i }).click();
    const task = page.getByRole("dialog", { name: "Add Task", exact: true });
    await expect(task.getByLabel("Task Title")).toBeFocused();
    await task.getByLabel("Task Title").fill("Keep my draft while organizing");
    await task
      .getByLabel("Category", { exact: true })
      .selectOption("__add_more__");
    const category = page.getByRole("dialog", {
      name: "Add Category",
      exact: true,
    });
    await expect(category.getByLabel("Category Name")).toBeFocused();
    await category.getByLabel("Category Name").fill("Creative work");
    await shot(page, `${route.slice(1)}-nested-category`);
    await category
      .getByRole("button", { name: "Add Category", exact: true })
      .click();
    await expect(category).toHaveCount(0);
    await expect(task.getByLabel("Category", { exact: true })).toHaveValue(
      "new-category",
    );
    await expect(task.getByLabel("Task Title")).toHaveValue(
      "Keep my draft while organizing",
    );
    await task
      .getByLabel("Project", { exact: true })
      .selectOption("__add_project__");
    const project = page.getByRole("dialog", {
      name: "Add Project",
      exact: true,
    });
    await project.getByLabel("Project Name").fill("A new chapter");
    await project
      .getByRole("radio", { name: "Select #456B8C as project color" })
      .click();
    await page.keyboard.press("ArrowRight");
    await expect(
      project.getByRole("radio", { name: "Select #6C8060 as project color" }),
    ).toHaveAttribute("aria-checked", "true");
    await shot(page, `${route.slice(1)}-project`);
    await project
      .getByRole("button", { name: "Add Project", exact: true })
      .click();
    await expect(project).toHaveCount(0);
    await expect(task.getByLabel("Project", { exact: true })).toHaveValue(
      "new-project",
    );
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden",
    );
    await shot(page, `${route.slice(1)}-task`);
    await task.getByRole("button", { name: "Add Task", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(
      task.getByRole("button", { name: "Close add task dialog" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
      "hidden",
    );
    expect(errors).toEqual([]);
  });
}

test("generation validates, preserves input on error and succeeds on retry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setup(page);
  let fail = true;
  await page.route("**/api/ai/generate-tasks", (route) =>
    route.fulfill(
      fail
        ? { status: 500, json: { message: "Please try again" } }
        : { json: { success: true, data: [] } },
    ),
  );
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Generate Tasks",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Generate Tasks", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Describe your plan or choose a topic to get started.",
  );
  await dialog
    .getByLabel("What do you want to accomplish?")
    .fill("I have an hour to learn React and plan a small project.");
  await dialog.getByRole("button", { name: "Coding", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Coding", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await dialog
    .getByRole("button", { name: "Generate Tasks", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toHaveText("Please try again");
  await expect(
    dialog.getByLabel("What do you want to accomplish?"),
  ).toHaveValue(/learn React/);
  await shot(page, "generate");
  fail = false;
  await dialog
    .getByRole("button", { name: "Generate Tasks", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
});

test("category and project dialogs on mobile and in dark mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, "/categories");
  await page.getByRole("button", { name: "Add Category", exact: true }).click();
  await page.getByLabel("Category Name").fill("Everyday inspiration");
  await shot(page, "category-mobile");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Projects \d/ }).click();
  await page.getByRole("button", { name: "Add Project", exact: true }).click();
  await shot(page, "project-mobile");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.getByRole("button", { name: "Add Project", exact: true }).click();
  await shot(page, "project-mobile-dark");
  const dialog = page.getByRole("dialog");
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.goto("/calendar");
  await page.getByRole("button", { name: /^Add task$/i }).click();
  await shot(page, "task-mobile");
  await page.setViewportSize({ width: 320, height: 568 });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await shot(page, "generate-small-mobile");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("failed task creation retains the draft and can be retried", async ({
  page,
}) => {
  await setup(page);
  let fail = true;
  await page.route("**/api/tasks", (route) =>
    route.request().method() === "POST" && fail
      ? route.fulfill({
          status: 500,
          json: { message: "Couldn't save this task yet." },
        })
      : route.fallback(),
  );
  await page.getByRole("button", { name: "Add Task", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add Task", exact: true });
  await dialog.getByLabel("Task Title").fill("A plan worth keeping");
  await dialog
    .getByLabel("Description", { exact: true })
    .fill("Keep these details if the request fails.");
  await dialog.getByRole("button", { name: "Add Task", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Couldn't save this task yet.",
  );
  await expect(dialog.getByLabel("Task Title")).toHaveValue(
    "A plan worth keeping",
  );
  await expect(dialog.getByLabel("Description", { exact: true })).toHaveValue(
    "Keep these details if the request fails.",
  );
  fail = false;
  await dialog.getByRole("button", { name: "Add Task", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .locator(".calendar-agenda")
      .getByText("A plan worth keeping", { exact: true }),
  ).toBeVisible();
});
