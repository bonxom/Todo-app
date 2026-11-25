import { test, expect } from "@playwright/test";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

const OUT = "/tmp/apple-liquid-glass-audit-after";

test("V2 collapsible sidebar & full Apple Liquid Glass consistency across all 9 pages", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await agentWorkspaceFixture(page);

  await page.route("**/api/ai/skill*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("skill-templates")) {
      return route.fulfill({
        status: 200,
        json: {
          success: true,
          data: [
            {
              id: "tpl-1",
              name: "Weekly Sprint Planner",
              description: "Structures weekly tasks into focused daily blocks.",
              version: "1.2",
            },
          ],
        },
      });
    }
    return route.fulfill({
      status: 200,
      json: {
        success: true,
        data: [
          {
            id: "skill-1",
            name: "Daily Focus Coach",
            description: "Triages urgent tasks into morning deep-work blocks.",
            instructions: "## Instructions\nPrioritize high-impact work first.",
            enabled: true,
            version: 1,
          },
        ],
      },
    });
  });

  await page.route("**/api/notifications**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/unread-count")) {
      return route.fulfill({ status: 200, json: { count: 1 } });
    }
    return route.fulfill({
      status: 200,
      json: {
        data: [
          {
            _id: "notif-1",
            taskId: "507f1f77bcf86cd799439001",
            taskTitle: "Explore directions for the homepage",
            dueAt: "2026-11-21T18:00:00.000Z",
            type: "due_soon",
            readAt: null,
            createdAt: "2026-11-21T07:00:00.000Z",
          },
          {
            _id: "notif-2",
            taskId: "507f1f77bcf86cd799439002",
            taskTitle: "Write the project kickoff notes",
            dueAt: "2026-11-20T15:30:00.000Z",
            type: "overdue",
            readAt: "2026-11-20T16:00:00.000Z",
            createdAt: "2026-11-20T15:30:00.000Z",
          },
        ],
        unreadCount: 1,
        pageInfo: { pageNo: 1, pageSize: 20, totalCount: 2, totalPage: 1 },
      },
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("orbit.v2-palette", "golden");
    localStorage.setItem("orbit-theme", "dark");
  });

  // 1. Dashboard + Collapsible Sidebar verification
  await page.goto("/v2/dashboard");
  await expect(page.getByTestId("v2-dashboard-page")).toBeVisible();

  // Verify custom cursor harmonizes with Golden Dark palette (not cyan)
  const cursorDotBg = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--cursor-dot-bg")
      .trim(),
  );
  expect(cursorDotBg).toBe("#f6c453");

  // Verify sidebar defaults to collapsed -> hover expands -> leaving collapses
  const sidebar = page.locator(".v2-sidebar-desktop");
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  const collapsedBox = (await sidebar.boundingBox())!;
  expect(collapsedBox.width).toBeLessThanOrEqual(84);

  await page.screenshot({
    path: `${OUT}/01-dashboard-collapsed-golden-dark.png`,
    fullPage: true,
  });

  await sidebar.hover();
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
  await page.waitForTimeout(300);
  const expandedBox = (await sidebar.boundingBox())!;
  expect(expandedBox.width).toBeGreaterThanOrEqual(220);

  await page.getByTestId("v2-dashboard-page").hover();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await page.waitForTimeout(300);

  // 2. Add project dialog (verify V2 Liquid Glass token bridge, no V1 cyan!)
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  const projectDialog = page.getByRole("dialog");
  await expect(projectDialog).toBeVisible();
  const addProjectSubmitBg = await projectDialog
    .getByRole("button", { name: /Add Project/i })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(addProjectSubmitBg).toBe("rgb(246, 196, 83)"); // Golden Dark --v2-accent
  await page.screenshot({
    path: `${OUT}/02-dialog-add-project-golden-dark.png`,
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // 3. Agents (Starter + Active)
  await page.goto("/v2/agents");
  await expect(page.getByTestId("v2-agents-page")).toBeVisible();
  await page.screenshot({ path: `${OUT}/03-agents-golden-dark.png` });

  // 4. Skills + Template dialog
  await page.goto("/v2/agents/skills");
  await expect(page.getByTestId("v2-skills-page")).toBeVisible();
  await page.getByRole("button", { name: "Add from template" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");

  // 5. Skill Editor + Preview toggle
  await page.goto("/v2/agents/skills/new");
  await expect(page.getByLabel(/Skill name/i)).toBeVisible();
  await page.getByRole("button", { name: /Preview/i }).click();

  // 6. Calendar: Week Detail -> Agenda -> Month -> Today Day Panel (must be fixed & inside viewport!)
  await page.goto("/v2/calendar");
  await expect(page.getByTestId("v2-calendar-page")).toBeVisible();
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await page
    .locator('.v2-calendar-cell[data-today="true"] .v2-calendar-day')
    .click();
  const dayPanel = page.locator(".v2-calendar-day-panel");
  await expect(dayPanel).toBeVisible();
  const dayPanelPos = await dayPanel.evaluate(
    (el) => getComputedStyle(el).position,
  );
  expect(dayPanelPos).toBe("fixed");
  const dayPanelBox = (await dayPanel.boundingBox())!;
  expect(dayPanelBox.y + dayPanelBox.height).toBeLessThanOrEqual(900);
  await page.screenshot({
    path: `${OUT}/04-calendar-month-day-golden-dark.png`,
  });

  // 7. Statistics (verify date input uses Golden Dark --v2-input-fill, NOT dark teal!)
  await page.goto("/v2/statistics");
  await expect(page.getByTestId("v2-statistics-page")).toBeVisible();
  await page.getByRole("button", { name: "7 days" }).click();
  const dateInputBg = await page
    .locator(".v2-statistics-date-input")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(dateInputBg).not.toContain("15, 37, 42");
  await page.screenshot({
    path: `${OUT}/05-statistics-golden-dark.png`,
    fullPage: true,
  });

  // 8. Notifications page (All / Unread segmented tray)
  await page.goto("/v2/notifications");
  await expect(page.locator(".v2-notifications-page")).toBeVisible();
  await page.getByRole("button", { name: "Unread", exact: true }).click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.screenshot({
    path: `${OUT}/06-notifications-golden-dark.png`,
    fullPage: true,
  });

  // 9. Settings page (Appearance section)
  await page.goto("/v2/settings");
  await expect(page.getByTestId("v2-settings-page")).toBeVisible();
  await page.getByRole("button", { name: /Appearance/i }).click();
  await page.screenshot({
    path: `${OUT}/07-settings-golden-dark.png`,
    fullPage: true,
  });

  // 10. 404 Not Found
  await page.goto("/v2/does-not-exist");
  await expect(page.getByTestId("v2-not-found-page")).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test("V2 Liquid Glass dropdowns render visibly in Ocean Light and Golden Dark", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await agentWorkspaceFixture(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const theme of [
    { palette: "ocean", mode: "light", slug: "ocean-light" },
    { palette: "golden", mode: "dark", slug: "golden-dark" },
  ] as const) {
    await page.goto("/v2/dashboard");
    await page.evaluate(
      ({ palette }) => {
        localStorage.setItem("orbit.v2-palette", palette);
      },
      { palette: theme.palette },
    );
    await page.reload();
    await expect(page.getByTestId("v2-dashboard-page")).toBeVisible();
    const currentTheme = await page.locator("html").getAttribute("data-theme");
    if (currentTheme !== theme.mode) {
      await page
        .getByRole("button", { name: /Switch to (dark|light) mode/i })
        .click();
    }
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      theme.mode,
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-v2-palette",
      theme.palette,
    );

    const inspectListbox = async () => {
      const menu = page.getByRole("listbox");
      await expect(menu).toBeVisible();
      await expect(menu).toHaveAttribute("data-ui-version", "v2");
      await expect
        .poll(async () =>
          Number(await menu.evaluate((el) => getComputedStyle(el).opacity)),
        )
        .toBeGreaterThan(0.95);
      const metrics = await menu.evaluate((el) => {
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          opacity: cs.opacity,
          zIndex: cs.zIndex,
          backgroundColor: cs.backgroundColor,
          backdropFilter: cs.backdropFilter,
          rect: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        };
      });
      expect(Number(metrics.opacity)).toBeGreaterThan(0.95);
      expect(Number(metrics.zIndex)).toBeGreaterThanOrEqual(3000);
      expect(metrics.rect.width).toBeGreaterThan(120);
      expect(metrics.rect.height).toBeGreaterThan(60);
      expect(metrics.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
      expect(metrics.backdropFilter).toContain("blur(");
      return menu;
    };

    // 1. Dashboard status filter dropdown
    const statusTrigger = page.locator(
      ".v2-task-toolbar [data-testid='custom-select-trigger']",
    );
    await statusTrigger.click();
    const statusMenu = await inspectListbox();
    await page.screenshot({
      path: `${OUT}/dropdown-toolbar-${theme.slug}.png`,
    });
    await statusMenu.getByRole("option", { name: "In progress" }).click();
    await expect(statusMenu).toBeHidden();
    await expect(statusTrigger).toContainText("In progress");

    // 2. Task Editor modal dropdowns (Project select open!)
    await page.getByRole("button", { name: "New task", exact: true }).click();
    const taskDialog = page.getByRole("dialog");
    await expect(taskDialog).toBeVisible();
    const projectTrigger = taskDialog
      .locator("[data-testid='custom-select-trigger']")
      .nth(2);
    await projectTrigger.click();
    const projectMenu = await inspectListbox();
    await page.screenshot({
      path: `${OUT}/dropdown-task-editor-${theme.slug}.png`,
    });
    const secondProjectOption = projectMenu.getByRole("option").nth(1);
    const chosenProjectName = (await secondProjectOption.innerText()).trim();
    await secondProjectOption.click();
    await expect(projectMenu).toBeHidden();
    await expect(projectTrigger).toContainText(chosenProjectName);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Discard changes" }).click();
    await expect(taskDialog).toBeHidden();

    // 3. Settings Workspace default status dropdown (SPA nav preserves theme)
    await page.getByRole("link", { name: /Settings/i }).click();
    await expect(page.getByTestId("v2-settings-page")).toBeVisible();
    await page.getByRole("button", { name: /Workspace/i }).click();
    const settingsTrigger = page.locator(
      "[data-testid='v2-settings-page'] [data-testid='custom-select-trigger']",
    );
    await settingsTrigger.click();
    const settingsMenu = await inspectListbox();
    await page.screenshot({
      path: `${OUT}/dropdown-settings-${theme.slug}.png`,
    });
    await settingsMenu.getByRole("option").nth(1).click();
    await expect(settingsMenu).toBeHidden();
  }

  expect(pageErrors).toEqual([]);
});
