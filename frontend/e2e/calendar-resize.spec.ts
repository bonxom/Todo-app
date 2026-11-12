import { test, expect, type Page, type Locator } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";

async function fixture(page: Page, missingStart = false) {
  await dashboardFixture(page);
  const at = (hour: number, minute = 0) => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  let task = {
    _id: "resize",
    title: "Resize study",
    description: "A focused session for reviewing the calendar.",
    startDate: missingStart ? null : at(9),
    dueDate: at(11),
    status: "in-progress",
    priority: "Medium",
    categoryId: { _id: "work", name: "Work" },
    projectId: null,
  };
  const writes: Record<string, string>[] = [];
  let fail = false;
  await page.route("**/api/tasks?**", (route) =>
    route.fulfill({
      json: {
        data: [task],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 1, totalPage: 1 },
      },
    }),
  );
  await page.route("**/api/tasks/resize", async (route) => {
    if (route.request().method() === "PUT") {
      const patch = route.request().postDataJSON();
      writes.push(patch);
      if (fail)
        return route.fulfill({
          status: 500,
          json: { message: "Test save failure" },
        });
      task = { ...task, ...patch };
    }
    await route.fulfill({ json: task });
  });
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto("/calendar");
  await expect(page.locator(".calendar-timeline-event")).toHaveCount(1);
  await page
    .locator(".calendar-board")
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  return {
    writes,
    fail: () => {
      fail = true;
    },
    task: () => task,
  };
}
async function drag(
  page: Page,
  handle: Locator,
  delta: number,
  release = true,
) {
  await handle.scrollIntoViewIfNeeded();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + delta, {
    steps: 8,
  });
  if (release) await page.mouse.up();
}
const start = (page: Page) =>
  page.getByRole("slider", { name: "Adjust start time of Resize study" });
const end = (page: Page) =>
  page.getByRole("slider", { name: "Adjust end time of Resize study" });

test("toolbar uses shared select in one row and pointer resizing persists only the moved edge", async ({
  page,
}) => {
  const state = await fixture(page);
  const controls = page.locator(".calendar-toolbar-controls");
  const detailed = await controls
    .getByRole("button", { name: "Detailed", exact: true })
    .boundingBox();
  const month = await controls
    .getByRole("button", { name: "Month", exact: true })
    .boundingBox();
  const select = await controls
    .locator(".ui-custom-select-trigger")
    .boundingBox();
  expect(Math.abs(detailed!.y - month!.y)).toBeLessThan(6);
  expect(Math.abs(detailed!.y - select!.y)).toBeLessThan(6);
  await controls.getByRole("button", { name: "30 min", exact: true }).click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name: "15 min", exact: true })
    .click();
  await expect(page.getByRole("combobox", { name: "Time detail" })).toHaveValue(
    "15",
  );
  await drag(page, start(page), 36, false);
  expect(state.writes).toHaveLength(0);
  await expect(page.locator(".calendar-resize-preview")).toHaveText(
    "09:15 – 11:00",
  );
  await expect(page.getByTestId("custom-cursor")).toHaveCSS("opacity", "0");
  await page.screenshot({
    path: "artifacts/calendar-resize-preview.png",
    fullPage: true,
  });
  await page.mouse.up();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(Object.keys(state.writes[0])).toEqual(["startDate"]);
  expect(new Date(state.writes[0].startDate).getMinutes()).toBe(15);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await controls.getByRole("button", { name: "15 min", exact: true }).click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name: "30 min", exact: true })
    .click();
  await drag(page, end(page), 36);
  await expect.poll(() => state.writes.length).toBe(2);
  expect(Object.keys(state.writes[1])).toEqual(["dueDate"]);
  expect(new Date(state.writes[1].dueDate).getHours()).toBe(11);
  expect(new Date(state.writes[1].dueDate).getMinutes()).toBe(30);
  await controls.getByRole("button", { name: "30 min", exact: true }).click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name: "60 min", exact: true })
    .click();
  await drag(page, end(page), 36);
  await expect.poll(() => state.writes.length).toBe(3);
  expect(new Date(state.writes[2].dueDate).getHours()).toBe(13);
  await page.reload();
  await expect(start(page)).toHaveAttribute("aria-valuenow", "555");
  await expect(end(page)).toHaveAttribute("aria-valuenow", "780");
  await page
    .locator(".calendar-board")
    .screenshot({ path: "artifacts/calendar-resize-toolbar-desktop.png" });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page
    .locator(".calendar-board")
    .screenshot({ path: "artifacts/calendar-resize-dark.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".calendar-board")
    .screenshot({ path: "artifacts/calendar-resize-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Escape and failed saves leave the original times intact; keyboard can resize", async ({
  page,
}) => {
  const state = await fixture(page);
  await drag(page, end(page), 36, false);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator(".calendar-resize-preview")).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
  await expect(end(page)).toHaveAttribute("aria-valuenow", "660");
  await start(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => state.writes.length).toBe(1);
  await expect(start(page)).toHaveAttribute("aria-valuenow", "570");
  state.fail();
  await drag(page, end(page), 36);
  await expect(page.getByRole("alert")).toContainText(
    "original time has been restored",
  );
  await expect(end(page)).toHaveAttribute("aria-valuenow", "660");
  await expect(start(page)).toHaveAttribute("aria-valuenow", "570");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("due-only task acquires a real start time only when its top edge is edited", async ({
  page,
}) => {
  const state = await fixture(page, true);
  await drag(page, end(page), 36);
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.task().startDate).toBeNull();
  await page.locator(".calendar-week-timeline-scroll").evaluate((el) => {
    el.scrollTop = 0;
  });
  await drag(page, start(page), 36);
  await expect.poll(() => state.writes.length).toBe(2);
  expect(Object.keys(state.writes[1])).toEqual(["startDate"]);
  expect(new Date(state.writes[1].startDate).getHours()).toBe(0);
  expect(new Date(state.writes[1].startDate).getMinutes()).toBe(30);
});

test("resize auto-scrolls near the edge and pointer cancellation never saves", async ({
  page,
}) => {
  const state = await fixture(page);
  const timeline = page.locator(".calendar-week-timeline-scroll");
  const before = await timeline.evaluate((el) => el.scrollTop);
  const handle = end(page);
  const box = (await handle.boundingBox())!;
  const viewport = (await timeline.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2,
    viewport.y + viewport.height - 12,
    { steps: 10 },
  );
  await expect
    .poll(() => timeline.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(before + 30);
  expect(state.writes).toHaveLength(0);
  await handle.dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  await expect(page.locator(".calendar-resize-preview")).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
});
