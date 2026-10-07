import { expect, test } from "@playwright/test";

test("starts light on a dark system and remembers an explicit choice across pages and reloads", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("link", { name: "Sign in", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL("/login");
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("syncs the preference between open tabs", async ({ page, context }) => {
  await page.goto("/");
  const second = await context.newPage();
  await second.goto("/login");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(second.locator("html")).toHaveAttribute("data-theme", "dark");
  await second.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("works for this session when theme storage is blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "orbit-theme")
        throw new DOMException("Blocked", "SecurityError");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "orbit-theme")
        throw new DOMException("Blocked", "SecurityError");
      return set.call(this, key, value);
    };
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("toggles the real task workspace on mobile without changing task actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("token", "theme-test-token");
    localStorage.setItem("refreshToken", "theme-test-refresh");
  });
  const user = {
    _id: "theme-user",
    name: "Theme Tester",
    email: "theme@example.com",
    role: "USER",
  };
  const task = {
    _id: "theme-task",
    title: "Review homepage",
    description: "Check the light theme",
    status: "in-progress",
    priority: "High",
    projectId: null,
    categoryId: null,
  };
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: user }));
  await page.route("**/api/projects**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/stats**", (route) =>
    route.fulfill({
      json: {
        totalTasks: 1,
        completedTasks: 0,
        inProgressTasks: 1,
        pendingTasks: 0,
        givenUpTasks: 0,
      },
    }),
  );
  await page.route("**/api/tasks**", (route) =>
    route.fulfill({
      json: {
        data: [task],
        pageInfo: { pageNo: 1, pageSize: 10, totalCount: 1, totalPage: 1 },
      },
    }),
  );
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Todos", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Mark .* as completed/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("textbox", { name: "Search tasks" })).toHaveCSS(
    "background-color",
    "rgb(23, 33, 49)",
  );
  await expect(
    page.getByRole("button", { name: /Mark .* as completed/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
