import { test, expect } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";

const firstTask = "Explore directions for the homepage";
const screenshot = async (page, name: string) => {
  await page.screenshot({
    path: `artifacts/dashboard-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
};

test.beforeEach(({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("desktop: status, search, sorting, project filters and stable summaries", async ({
  page,
}) => {
  await dashboardFixture(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("button", { name: firstTask, exact: true }),
  ).toBeVisible();
  await screenshot(page, "desktop");
  await page.locator(".ui-global-task-filter__trigger").click();
  await page.getByRole("menuitemcheckbox", { name: "In Progress" }).click();
  await expect(page.locator(".todo-task")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Show total tasks" }),
  ).toContainText("7");
  await expect(
    page.getByRole("button", { name: "Filter by Website refresh" }),
  ).toContainText("1 / 3 tasks");
  await page.getByRole("button", { name: "Clear" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Search tasks" }).fill("homepage");
  await expect(page.locator(".todo-task")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Search tasks" })
    .fill("nothing-matches-this");
  await expect(page.getByText("No tasks match current filters")).toBeVisible();
  await screenshot(page, "no-results");
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.locator(".todo-task")).toHaveCount(7);
  await page
    .getByRole("combobox", { name: "Sort tasks by" })
    .selectOption("title");
  await expect(page.locator(".todo-task-title").first()).toHaveText(
    "Book a coffee with Jamie",
  );
  await page.getByRole("button", { name: "Filter by Website refresh" }).click();
  await expect(page.locator(".todo-task")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Filter by Studio essentials" }),
  ).toContainText("0 / 2 tasks");
  await page.getByRole("button", { name: "Standalone", exact: true }).click();
  await expect(page.locator(".todo-task")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Standalone tasks" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove project filter" }).click();
  await expect(page.locator(".todo-task")).toHaveCount(7);
});

test("task lifecycle: create, edit, complete, restore, accept and delete", async ({
  page,
}) => {
  await dashboardFixture(page);
  await page.goto("/dashboard");
  await page.locator(".ui-page-add-button").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Task Title")).toBeFocused();
  await dialog.getByLabel("Task Title").fill("Prepare a thoughtful launch");
  await dialog
    .getByLabel("Description")
    .fill("A real interaction through the existing form.");
  await screenshot(page, "add-task");
  await dialog.getByRole("button", { name: "Add Task", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("button", { name: "Prepare a thoughtful launch", exact: true })
    .click();
  await dialog.getByLabel("Task Title").fill("Prepare the launch checklist");
  await dialog.getByRole("button", { name: /Save|Update/ }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Mark Prepare the launch checklist as completed",
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Restore Prepare the launch checklist to in-progress",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Restore Prepare the launch checklist to in-progress",
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Mark Prepare the launch checklist as completed",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Accept Plan next week’s studio priorities" })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Mark Plan next week’s studio priorities as completed",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Actions for Prepare the launch checklist" })
    .click();
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Prepare the launch checklist",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Actions for Prepare the launch checklist" })
    .click();
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Prepare the launch checklist",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("keyboard: dialog focus, Escape, and project-scoped creation", async ({
  page,
}) => {
  await dashboardFixture(page);
  await page.goto("/dashboard");
  const add = page.locator(".ui-page-add-button");
  await add.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Task Title")).toBeFocused();
  await dialog.getByRole("button", { name: "Add Task", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close add task dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(add).toBeFocused();
  await page
    .getByRole("button", { name: "Add task to Website refresh" })
    .click();
  await expect(dialog.getByLabel("Project", { exact: true })).toHaveValue(
    "website",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: `Actions for ${firstTask}` }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: `Actions for ${firstTask}` }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Edit task", exact: true }),
  ).toHaveCount(0);
});

test("mobile and tablet: no overflow, navigation, dark mode", async ({
  page,
}) => {
  await dashboardFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("button", { name: firstTask, exact: true }),
  ).toBeVisible();
  await screenshot(page, "mobile");
  for (const width of [360, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("link", { name: "Categories", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close navigation", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("link", { name: "Categories", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await screenshot(page, "mobile-dark");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await screenshot(page, "dark");
});

test("empty workspace has working first-task and project entry points", async ({
  page,
}) => {
  await dashboardFixture(page, true);
  await page.goto("/dashboard");
  await expect(page.getByText("No tasks in this workspace yet")).toBeVisible();
  await screenshot(page, "empty");
  await page.getByRole("button", { name: "Add your first task" }).click();
  await expect(page.getByRole("dialog", { name: "Add Task" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add Project" })).toBeVisible();
});

test("pagination preserves full project and workspace totals", async ({
  page,
}) => {
  await dashboardFixture(page, false, true);
  await page.goto("/dashboard");
  await expect(page.locator(".todo-task")).toHaveCount(10);
  await expect(
    page.getByRole("button", { name: "Show total tasks" }),
  ).toContainText("19");
  await expect(
    page.getByRole("button", { name: "Filter by Website refresh" }),
  ).toContainText("1 / 15 tasks");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".todo-task")).toHaveCount(9);
  await expect(
    page.getByRole("button", { name: "Filter by Website refresh" }),
  ).toContainText("1 / 15 tasks");
  await page.locator(".ui-global-task-filter__trigger").click();
  await page.getByRole("menuitemcheckbox", { name: "Completed" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".todo-task")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Page 1", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});
