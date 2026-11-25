import { expect, test, type Page, type Route } from "@playwright/test";
import path from "node:path";

const ARTIFACT_DIR = path.resolve(
  import.meta.dirname,
  "../artifacts/settings-review",
);

async function installSettingsFixture(
  page: Page,
  options: {
    version?: "v1" | "v2";
    theme?: "light" | "dark";
    language?: "en" | "vi";
    palette?: "mint" | "ocean" | "golden" | "crimson";
    unreadCount?: number;
  } = {},
) {
  const {
    version = "v2",
    theme = "light",
    language = "en",
    palette = "mint",
    unreadCount = 4,
  } = options;

  let currentUser = {
    _id: "507f1f77bcf86cd799439000",
    id: "507f1f77bcf86cd799439000",
    name: "Minh Nguyen",
    email: "minh@orbit.test",
    role: "USER",
    dob: "1998-05-12T00:00:00.000Z",
    nationality: "Vietnam",
    avatarUrl: "",
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-11-18T10:00:00.000Z",
  };

  let categories = [
    { _id: "cat-1", id: "cat-1", name: "Uncategorized" },
    { _id: "cat-2", id: "cat-2", name: "Work" },
    { _id: "cat-3", id: "cat-3", name: "Personal" },
  ];

  const projects = [
    {
      _id: "proj-1",
      id: "proj-1",
      name: "Orbit Liquid Glass",
      description: "Settings and palette upgrade",
      color: "#0c5da8",
      status: "active",
    },
  ];

  const tasks = [
    {
      _id: "task-1",
      id: "task-1",
      title: "Review Ocean theme contrast",
      status: "in-progress",
      priority: "High",
      categoryId: categories[1],
      projectId: projects[0],
      dueDate: "2026-11-20T14:00:00.000Z",
    },
    {
      _id: "task-2",
      id: "task-2",
      title: "Finalize settings spec",
      status: "completed",
      priority: "Medium",
      categoryId: categories[1],
      projectId: projects[0],
      dueDate: "2026-11-19T14:00:00.000Z",
    },
  ];

  await page.addInitScript(
    ({ user, ver, th, lang, pal }) => {
      if (!window.sessionStorage.getItem("__settingsFixtureInitialized")) {
        localStorage.clear();
        localStorage.setItem("token", "valid-settings-token");
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("orbit.ui-version", ver);
        localStorage.setItem("orbit-theme", th);
        localStorage.setItem("orbit.language", lang);
        localStorage.setItem("orbit.v2-palette", pal);
        window.sessionStorage.setItem("__settingsFixtureInitialized", "1");
      }
    },
    {
      user: currentUser,
      ver: version,
      th: theme,
      lang: language,
      pal: palette,
    },
  );

  await page.route("**/api/**", async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;
    const method = req.method();
    if (!pathname.startsWith("/api/")) {
      return route.continue();
    }

    if (pathname === "/api/auth/me" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(currentUser),
      });
    }

    if (pathname === "/api/auth/update-info" && method === "PUT") {
      const body = req.postDataJSON() as Record<string, unknown>;
      currentUser = {
        ...currentUser,
        ...body,
        updatedAt: new Date().toISOString(),
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: currentUser }),
      });
    }

    if (pathname === "/api/auth/change-password" && method === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Password updated" }),
      });
    }

    if (pathname === "/api/auth/logout" && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Logged out" }),
      });
    }

    if (pathname === "/api/categories" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(categories),
      });
    }

    if (pathname === "/api/categories" && method === "POST") {
      const body = req.postDataJSON() as { name: string };
      const created = {
        _id: `cat-${categories.length + 1}`,
        id: `cat-${categories.length + 1}`,
        name: body.name,
      };
      categories = [...categories, created];
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(created),
      });
    }

    if (pathname.startsWith("/api/categories/") && method === "DELETE") {
      const id = pathname.split("/").pop();
      categories = categories.filter((c) => c._id !== id);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Deleted" }),
      });
    }

    if (pathname === "/api/projects" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(projects),
      });
    }

    if (pathname === "/api/tasks" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: tasks,
          pageInfo: {
            pageNo: 1,
            pageSize: 10,
            totalCount: tasks.length,
            totalPage: 1,
          },
        }),
      });
    }

    if (pathname === "/api/stats" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalTasks: tasks.length,
          completedTasks: 1,
          inProgressTasks: 1,
          pendingTasks: 0,
          givenUpTasks: 0,
          categoryStats: [],
          dailyStats: [],
        }),
      });
    }

    if (pathname === "/api/notifications/unread-count") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ count: unreadCount }),
      });
    }

    if (pathname === "/api/notifications") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          pageInfo: { pageNo: 1, pageSize: 20, totalCount: 0, totalPage: 1 },
        }),
      });
    }

    if (pathname.startsWith("/api/ai/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          capabilities: { taskProposals: false, attachments: false },
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

test.describe("Settings Page & V2 Ocean Palette", () => {
  test("V2 sidebar shows user avatar beside logout and navigates to /v2/settings", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installSettingsFixture(page, { version: "v2" });

    await page.goto("/v2/dashboard");

    const sidebar = page.locator(".v2-sidebar-desktop");
    await sidebar.hover();
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");
    await page.waitForTimeout(300);

    const footer = page.getByTestId("v2-sidebar-footer");
    await expect(footer).toBeVisible();

    const profileLink = footer.getByTestId("v2-sidebar-profile-link");
    const signOutBtn = footer.getByRole("button", { name: "Sign out" });

    await expect(profileLink).toBeVisible();
    await expect(profileLink).toContainText("Minh Nguyen");
    await expect(signOutBtn).toBeVisible();

    const profileBox = await profileLink.boundingBox();
    const logoutBox = await signOutBtn.boundingBox();
    expect(profileBox).not.toBeNull();
    expect(logoutBox).not.toBeNull();
    expect(profileBox!.height).toBeGreaterThanOrEqual(44);
    expect(logoutBox!.height).toBeGreaterThanOrEqual(44);
    // Positioned side by side in the same footer row
    expect(Math.abs(profileBox!.y - logoutBox!.y)).toBeLessThan(12);
    expect(logoutBox!.x).toBeGreaterThan(profileBox!.x);

    await profileLink.click();
    await expect(page).toHaveURL(/\/v2\/settings/);
    await expect(page.getByTestId("v2-settings-page")).toBeVisible();
    await expect(profileLink).toHaveAttribute("data-active", "true");
  });

  test("V2 Ocean palette switches tokens in Light & Dark modes and persists on reload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installSettingsFixture(page, {
      version: "v2",
      theme: "light",
      palette: "mint",
    });

    await page.goto("/v2/settings?section=appearance");
    await expect(page.getByTestId("v2-palette-picker")).toBeVisible();

    const mintAccent = await page
      .locator(".v2-app")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--v2-accent").trim(),
      );
    expect(mintAccent).toBe("#14675f");

    await page.getByTestId("v2-palette-option-ocean").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-v2-palette",
      "ocean",
    );

    const oceanLightAccent = await page
      .locator(".v2-app")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--v2-accent").trim(),
      );
    expect(oceanLightAccent).toBe("#0c5da8");

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "v2-settings-ocean-light.png"),
      fullPage: true,
    });

    // Switch to Dark mode and verify Ocean Dark tokens
    await page.getByRole("button", { name: /^Dark$/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const oceanDarkAccent = await page
      .locator(".v2-app")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--v2-accent").trim(),
      );
    expect(oceanDarkAccent).toBe("#7cc4fa");

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "v2-settings-ocean-dark.png"),
      fullPage: true,
    });

    // Switch to Golden in Dark mode, then Light mode
    await page.getByTestId("v2-palette-option-golden").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-v2-palette",
      "golden",
    );
    const goldenDarkAccent = await page
      .locator(".v2-app")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--v2-accent").trim(),
      );
    expect(goldenDarkAccent).toBe("#f6c453");
    await page.mouse.move(10, 10);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "v2-settings-golden-dark.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: /^Light$/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const goldenLightAccent = await page
      .locator(".v2-app")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--v2-accent").trim(),
      );
    expect(goldenLightAccent).toBe("#9a6308");
    await page.mouse.move(10, 10);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "v2-settings-golden-light.png"),
      fullPage: true,
    });

    // Switch to Crimson in Light mode, then Dark mode
    await page.getByTestId("v2-palette-option-crimson").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-v2-palette",
      "crimson",
    );
    const crimsonLightAccent = await page
      .locator(".v2-app")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--v2-accent").trim(),
      );
    expect(crimsonLightAccent).toBe("#a61c3c");
    await page.mouse.move(10, 10);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "v2-settings-crimson-light.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: /^Dark$/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const crimsonDarkAccent = await page
      .locator(".v2-app")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--v2-accent").trim(),
      );
    expect(crimsonDarkAccent).toBe("#ff8fa3");
    await page.mouse.move(10, 10);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "v2-settings-crimson-dark.png"),
      fullPage: true,
    });

    // Reload and verify localStorage persistence
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-v2-palette",
      "crimson",
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByTestId("v2-palette-option-crimson")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("V1 /profile redirects to /settings and hides V2 color palette picker", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installSettingsFixture(page, { version: "v1" });

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId("v1-settings-page")).toBeVisible();

    await page.getByTestId("settings-tab-appearance").click();
    await expect(page.getByTestId("v2-palette-picker")).toHaveCount(0);
    // Move pointer away from V1 collapsible sidebar and wait for collapse transition before screenshot
    await page.mouse.move(900, 300);
    await page.waitForTimeout(300);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "v1-settings-appearance.png"),
      fullPage: true,
    });

    // Version switcher maps /settings -> /v2/settings
    await page.getByRole("button", { name: /Try V2/i }).click();
    await expect(page).toHaveURL(/\/v2\/settings/);
  });

  test("Local preferences drive live Notification badge, AI bubble, Calendar week start, and Profile/Category actions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installSettingsFixture(page, { version: "v2", unreadCount: 5 });

    await page.goto("/v2/settings");

    // 1. Update profile name inline
    const nameInput = page.getByLabel("Full name");
    await nameInput.fill("Minh Ocean");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile changes saved.")).toBeVisible();

    // 2. Hide notification unread badge
    await expect(page.getByTestId("notification-badge")).toBeVisible();
    await page.getByTestId("settings-tab-notifications").click();
    await page
      .getByRole("switch", { name: /Show unread count badge/i })
      .click();
    await expect(page.getByTestId("notification-badge")).toHaveCount(0);

    // 3. Hide floating AI assistant bubble
    await expect(page.getByTestId("v2-assistant-trigger")).toBeVisible();
    await page.getByTestId("settings-tab-agent").click();
    await page
      .getByRole("switch", { name: /Show floating assistant bubble/i })
      .click();
    await expect(page.getByTestId("v2-assistant-trigger")).toHaveCount(0);

    // 4. Create category + set week start to Monday and verify on V2 Calendar
    await page.getByTestId("settings-tab-workspace").click();
    await page.getByPlaceholder("New category name…").fill("Focus");
    await page.getByRole("button", { name: "Add category" }).click();
    await expect(page.getByText("Category created.")).toBeVisible();
    await expect(page.getByText("Focus", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /^Monday$/i }).click();
    await page.getByRole("link", { name: /Open Calendar/i }).click();
    await expect(page).toHaveURL(/\/v2\/calendar/);

    const firstWeekdayHeader = page
      .locator('.v2-calendar-weekdays [role="columnheader"]')
      .first();
    await expect(firstWeekdayHeader).toContainText(/Mon/i);
  });

  test("Vietnamese mobile (390px) and tablet (768px) layouts have zero horizontal overflow", async ({
    page,
  }) => {
    await installSettingsFixture(page, {
      version: "v2",
      language: "vi",
      palette: "ocean",
    });

    for (const vp of [
      { name: "mobile", width: 390, height: 844 },
      { name: "tablet", width: 768, height: 1024 },
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/v2/settings?section=appearance");
      await expect(page.getByTestId("v2-settings-page")).toBeVisible();
      await expect(page.getByTestId("v2-palette-picker")).toBeVisible();

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `v2-settings-vi-${vp.name}.png`),
        fullPage: true,
      });
    }
  });
});
