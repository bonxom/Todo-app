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

  // Verify sidebar expanded width -> collapse -> collapsed width -> expand
  const sidebar = page.locator(".v2-sidebar-desktop");
  const expandedBox = (await sidebar.boundingBox())!;
  expect(expandedBox.width).toBeGreaterThanOrEqual(220);

  const toggleBtn = page.getByTestId("v2-sidebar-toggle");
  await toggleBtn.click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await page.waitForTimeout(300);
  const collapsedBox = (await sidebar.boundingBox())!;
  expect(collapsedBox.width).toBeLessThanOrEqual(84);

  await page.screenshot({
    path: `${OUT}/01-dashboard-collapsed-golden-dark.png`,
    fullPage: true,
  });

  // Expand sidebar back
  await toggleBtn.click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
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
