import { test, expect, type Page } from "@playwright/test";
import { installV2Fixture } from "./frontend-v2.fixture";
import { dashboardFixture } from "./dashboard.fixture";

interface FixtureTask {
  _id: string;
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "given-up";
  priority: "Low" | "Medium" | "High";
  categoryId: { _id: string; name: string };
  projectId: {
    _id: string;
    name: string;
    description: string;
    color: string;
    status: string;
  } | null;
  startDate: string;
  dueDate: string;
}

const FIXED_NOW_ISO = "2026-11-25T14:00:00.000Z"; // 09:00 in America/New_York

function localIso(
  year: number,
  monthZero: number,
  day: number,
  hour: number,
  minute = 0,
): string {
  // America/New_York is UTC-5 in late Nov/Dec/Jan (EST).
  return new Date(
    Date.UTC(year, monthZero, day, hour + 5, minute, 0, 0),
  ).toISOString();
}

async function installTimelineFixture(
  page: Page,
  options: {
    theme?: "light" | "dark";
    language?: "en" | "vi";
    withEmptyMiddleWindow?: boolean;
  } = {},
) {
  const {
    theme = "light",
    language = "en",
    withEmptyMiddleWindow = false,
  } = options;

  await installV2Fixture(page, {
    authenticated: true,
    preferredVersion: "v2",
    theme,
    language,
  });

  // Freeze Date.now / new Date() to Nov 25, 2026 09:00 America/New_York while keeping timers normal.
  await page.addInitScript((fixedIso) => {
    const fixedTime = new Date(fixedIso).getTime();
    const OriginalDate = Date;
    class FrozenDate extends OriginalDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length === 0) {
          super(fixedTime);
        } else {
          super(...args);
        }
      }
      static now() {
        return fixedTime;
      }
    }
    Object.defineProperty(window, "Date", {
      value: FrozenDate,
      writable: true,
      configurable: true,
    });
  }, FIXED_NOW_ISO);

  const category = {
    _id: "507f1f77bcf86cd799439091",
    name: "Engineering",
  };
  const project = {
    _id: "507f1f77bcf86cd799439090",
    name: "Orbit V2 Core",
    description: "V2 Liquid Glass",
    color: "#126b78",
    status: "active",
  };

  const tasks: FixtureTask[] = [
    {
      _id: "507f1f77bcf86cd799439101",
      id: "507f1f77bcf86cd799439101",
      title: "Submit weekly report",
      description: "Summarize completed work and blockers.",
      status: "in-progress",
      priority: "High",
      categoryId: category,
      projectId: project,
      startDate: "",
      dueDate: localIso(2026, 10, 25, 9, 30),
    },
    {
      _id: "507f1f77bcf86cd799439102",
      id: "507f1f77bcf86cd799439102",
      title: "Prepare team summary",
      description: "",
      status: "pending",
      priority: "Medium",
      categoryId: category,
      projectId: project,
      startDate: "",
      dueDate: localIso(2026, 10, 25, 17, 30),
    },
    {
      _id: "507f1f77bcf86cd799439103",
      id: "507f1f77bcf86cd799439103",
      title: "Check meeting schedule",
      description: "Confirm agenda with design.",
      status: "pending",
      priority: "Low",
      categoryId: category,
      projectId: null,
      startDate: "",
      dueDate: localIso(2026, 10, 26, 8, 30),
    },
    // Extra tasks across Window 1 so the list exceeds viewport height and scrolls naturally.
    ...Array.from({ length: 10 }, (_, idx) => ({
      _id: `507f1f77bcf86cd7994392${String(idx + 1).padStart(2, "0")}`,
      id: `507f1f77bcf86cd7994392${String(idx + 1).padStart(2, "0")}`,
      title: `Sprint deliverable ${idx + 1} with a sufficiently descriptive title for wrapping checks`,
      description: `Milestone item ${idx + 1}`,
      status: (idx % 3 === 0 ? "completed" : "pending") as
        "completed" | "pending",
      priority: "Medium" as const,
      categoryId: category,
      projectId: project,
      startDate: "",
      dueDate: localIso(2026, 10, 28 + Math.floor(idx / 2), 10 + (idx % 3), 0),
    })),
    // Window 2 (Dec 9 - Dec 22) unless omitted to exercise empty-window continuation.
    ...(withEmptyMiddleWindow
      ? []
      : [
          {
            _id: "507f1f77bcf86cd799439301",
            id: "507f1f77bcf86cd799439301",
            title: "December release readiness",
            description: "Final pre-release checklist.",
            status: "pending" as const,
            priority: "High" as const,
            categoryId: category,
            projectId: project,
            startDate: "",
            dueDate: localIso(2026, 11, 12, 11, 0),
          },
        ]),
    // Window 3 (Dec 23 - Jan 5) across year boundary.
    {
      _id: "507f1f77bcf86cd799439401",
      id: "507f1f77bcf86cd799439401",
      title: "January kickoff planning",
      description: "Set Q1 priorities.",
      status: "pending",
      priority: "High",
      categoryId: category,
      projectId: project,
      startDate: "",
      dueDate: localIso(2027, 0, 2, 10, 0),
    },
  ];

  // Layer Timeline-aware /api/tasks handler on top of installV2Fixture.
  await page.route("**/api/tasks**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/tasks" && method === "GET") {
      const startDate = url.searchParams.get("startDate");
      const endDate = url.searchParams.get("endDate");
      const pageNo = parseInt(url.searchParams.get("pageNo") || "1", 10);
      const pageSize = parseInt(url.searchParams.get("pageSize") || "10", 10);

      let filtered = [...tasks];
      if (startDate && endDate) {
        const startMs = new Date(startDate).getTime();
        const endMs = new Date(endDate).getTime();
        filtered = filtered.filter((task) => {
          if (!task.dueDate) return false;
          const dueMs = new Date(task.dueDate).getTime();
          return dueMs >= startMs && dueMs <= endMs;
        });
      }

      filtered.sort((a, b) => {
        const diff =
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return diff !== 0 ? diff : a._id.localeCompare(b._id);
      });

      const totalCount = filtered.length;
      const totalPage = Math.ceil(totalCount / pageSize);
      const start = (pageNo - 1) * pageSize;
      const paginatedData = filtered.slice(start, start + pageSize);

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: paginatedData,
          pageInfo: { pageNo, pageSize, totalCount, totalPage },
        }),
      });
    }

    if (path === "/api/tasks" && method === "POST") {
      const payload = request.postDataJSON();
      const id = `507f1f77bcf86cd799439${String(tasks.length + 500).padStart(3, "0")}`;
      const created: FixtureTask = {
        _id: id,
        id,
        title: payload.title ?? "Untitled",
        description: payload.description ?? "",
        status: "pending",
        priority: payload.priority ?? "Medium",
        categoryId: category,
        projectId: payload.projectId ? project : null,
        startDate: payload.startDate ?? "",
        dueDate: payload.dueDate ?? localIso(2026, 10, 27, 13, 0),
      };
      tasks.push(created);
      return route.fulfill({ status: 201, json: created });
    }

    if (path.endsWith("/start") && method === "PUT") {
      const id = path.split("/")[3];
      const task = tasks.find((item) => item._id === id);
      if (!task)
        return route.fulfill({
          status: 404,
          json: { message: "Task not found" },
        });
      task.status = "in-progress";
      return route.fulfill({ status: 200, json: task });
    }

    if (path.endsWith("/finish") && method === "PUT") {
      const id = path.split("/")[3];
      const task = tasks.find((item) => item._id === id);
      if (!task)
        return route.fulfill({
          status: 404,
          json: { message: "Task not found" },
        });
      task.status = "completed";
      return route.fulfill({ status: 200, json: task });
    }

    if (path.startsWith("/api/tasks/") && method === "PUT") {
      const id = path.split("/")[3];
      const task = tasks.find((item) => item._id === id);
      if (!task)
        return route.fulfill({
          status: 404,
          json: { message: "Task not found" },
        });
      Object.assign(task, request.postDataJSON());
      return route.fulfill({ status: 200, json: task });
    }

    if (path.startsWith("/api/tasks/") && method === "GET") {
      const id = path.split("/")[3];
      const task = tasks.find((item) => item._id === id);
      if (!task)
        return route.fulfill({
          status: 404,
          json: { message: "Task not found" },
        });
      return route.fulfill({ status: 200, json: task });
    }

    return route.fallback();
  });
}

test.describe("Calendar V2 Timeline", () => {
  test.use({ timezoneId: "America/New_York" });

  test("switches modes, scrolls to load windows, returns to Today, and updates via dialogs", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installTimelineFixture(page);
    await page.goto("/v2/calendar");

    // Browse next month, then switch to Timeline -> starts today and hides period arrows.
    await page
      .getByRole("button", { name: "Next period", exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /December 2026/i,
    );

    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Previous period", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Next period", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Today", exact: true }),
    ).toBeVisible();

    const timeline = page.getByTestId("v2-calendar-timeline");
    await expect(timeline.getByText("Submit weekly report")).toBeVisible();
    await expect(timeline.getByText("Today", { exact: true })).toBeVisible();
    await expect(timeline.getByText("Tomorrow", { exact: true })).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Load more days", exact: true }),
    ).toHaveCount(0);

    // Real scroll to the bottom automatically appends Window 2 while keeping Window 1 rows.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText("December release readiness")).toBeVisible();
    await expect(page.getByText("Submit weekly report")).toBeVisible();

    // Clicking Today scrolls back to the top of the Timeline.
    await page.getByRole("button", { name: "Today", exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThan(200);

    // Keyboard open with Enter, close restores focus to the task row.
    const row = page.getByRole("button", { name: /Prepare team summary/i });
    await row.focus();
    await page.keyboard.press("Enter");
    const detailsDialog = page.getByRole("dialog");
    await expect(detailsDialog).toBeVisible();

    // Start task from details dialog -> status updates in Timeline.
    await detailsDialog
      .getByRole("button", { name: "Start", exact: true })
      .click();
    await detailsDialog
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await expect(detailsDialog).toHaveCount(0);
    await expect(row).toBeFocused();
    await expect(row).toContainText("In progress");

    // Edit task due date to another loaded day -> moves under that date group.
    await row.click();
    await page.getByRole("button", { name: "Edit task", exact: true }).click();
    await page.getByLabel("Due date", { exact: true }).fill("2026-11-26T16:00");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Edit task", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const tomorrowGroup = page.locator(".v2-timeline-day-group").filter({
      has: page.getByRole("heading", { name: /November 26, 2026/i }),
    });
    await expect(
      tomorrowGroup.getByRole("button", { name: /Prepare team summary/i }),
    ).toBeVisible();

    // Create a new task from Timeline -> appears in Timeline.
    await page.getByRole("button", { name: "New task", exact: true }).click();
    await page
      .getByLabel("Title", { exact: true })
      .fill("Timeline created task");
    await page.getByLabel("Due date", { exact: true }).fill("2026-11-27T13:15");
    await page
      .getByRole("button", { name: "Create task", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Timeline created task")).toBeVisible();

    // Switching back to Month preserves December 2026.
    await page.getByRole("button", { name: "Month", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      /December 2026/i,
    );
  });

  test("automatically continues through an empty window when scrolling down", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installTimelineFixture(page, { withEmptyMiddleWindow: true });
    await page.goto("/v2/calendar");

    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await expect(page.getByText("Submit weekly report")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Load more days", exact: true }),
    ).toHaveCount(0);

    // Scrolling to bottom loads empty Window 2 and seamlessly continues into Window 3 (Jan 2 task).
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText("January kickoff planning")).toBeVisible();
  });

  test("selecting a calendar cell sets New task default start to 00:00 and due to 23:59", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installTimelineFixture(page);
    await page.goto("/v2/calendar");

    // Click November 27 cell in Month view.
    await page.getByRole("button", { name: /November 27, 2026/i }).click();
    await page.getByRole("button", { name: "New task", exact: true }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Start date", { exact: true })).toHaveValue(
      "2026-11-27T00:00",
    );
    await expect(dialog.getByLabel("Due date", { exact: true })).toHaveValue(
      "2026-11-27T23:59",
    );

    await dialog.getByLabel("Title", { exact: true }).fill("Cell default task");
    await dialog
      .getByRole("button", { name: "Create task", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);

    const dayPanel = page.getByRole("complementary", {
      name: /November 27, 2026/i,
    });
    await expect(dayPanel.getByText("Cell default task")).toBeVisible();
  });

  test("Calendar V1 does not show the Timeline view control", async ({
    page,
  }) => {
    await dashboardFixture(page);
    await page.goto("/calendar");
    await expect(
      page.getByRole("heading", { name: "Calendar", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Timeline", exact: true }),
    ).toHaveCount(0);
  });

  for (const [width, theme, language] of [
    [360, "light", "vi"],
    [360, "dark", "en"],
    [768, "light", "vi"],
    [768, "dark", "en"],
    [1440, "light", "en"],
    [1440, "dark", "vi"],
  ] as const) {
    test(`responsive layout and focus check at ${width}px (${theme}, ${language})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await installTimelineFixture(page, { theme, language });
      await page.goto("/v2/calendar");

      const timelineLabel = language === "vi" ? "Dòng thời gian" : "Timeline";
      await page
        .getByRole("button", { name: timelineLabel, exact: true })
        .click();
      await expect(page.getByText("Submit weekly report")).toBeVisible();

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);

      // Verify keyboard focus visibility on a timeline task row.
      const row = page.getByRole("button", { name: /Submit weekly report/i });
      await row.focus();
      const outlineWidth = await row.evaluate((el) =>
        parseFloat(getComputedStyle(el).outlineWidth || "0"),
      );
      expect(outlineWidth).toBeGreaterThan(0);

      await page.mouse.move(0, 0);
      await page.screenshot({
        path: `artifacts/timeline-${width}-${theme}-${language}.png`,
        fullPage: true,
      });
    });
  }

  test("adapts date marker layout when assistant dock is open at 1440px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installTimelineFixture(page, { theme: "light", language: "en" });
    await page.goto("/v2/calendar");
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await expect(page.getByText("Submit weekly report")).toBeVisible();

    const firstGroup = page.locator(".v2-timeline-day-group").first();
    const marker = firstGroup.locator(".v2-timeline-day-marker");
    const list = firstGroup.locator(".v2-timeline-day-tasks");

    const markerBefore = (await marker.boundingBox())!;
    const listBefore = (await list.boundingBox())!;
    expect(markerBefore.x + markerBefore.width).toBeLessThanOrEqual(
      listBefore.x + 2,
    );

    await page
      .getByRole("button", { name: "Open assistant", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Dock chat to the side", exact: true })
      .click();
    await expect(page.getByTestId("v2-layout")).toHaveAttribute(
      "data-dock",
      "open",
    );

    await expect
      .poll(async () => {
        const markerAfter = (await marker.boundingBox())!;
        const listAfter = (await list.boundingBox())!;
        return markerAfter.y + markerAfter.height <= listAfter.y + 4;
      })
      .toBe(true);

    const dock = (await page.getByTestId("v2-assistant-panel").boundingBox())!;
    const row = firstGroup.getByRole("button", {
      name: /Submit weekly report/i,
    });
    const rowBox = (await row.boundingBox())!;
    expect(rowBox.x + rowBox.width).toBeLessThanOrEqual(dock.x);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

    await page.mouse.move(0, 0);
    await page.screenshot({
      path: "artifacts/timeline-1440-docked.png",
      fullPage: true,
    });
  });
});
