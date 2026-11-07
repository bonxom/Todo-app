import { test, expect } from "@playwright/test";
import { setupUiCompositionMocks } from "./ui-composition.fixture";

test("renders a read-only present_ui surface with Card, Text, and Table on desktop and mobile without document overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await setupUiCompositionMocks(page, { mode: "readonly" });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();

  await expect(
    page.getByRole("heading", { name: "Weekly Study Plan" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("Practice test 3")).toBeVisible();
  await expect(page.getByRole("button", { name: /Xác nhận/ })).toHaveCount(0);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("table")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("edits, saves, reloads, and confirms a composed propose_tasks surface with split TaskList and TaskProposalActions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const { actions } = await setupUiCompositionMocks(page, {
    mode: "composed-proposal",
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();

  await expect(
    page.getByText("Review and confirm the proposed study tasks below."),
  ).toBeVisible();

  const title = page.getByRole("textbox", {
    name: "Task 1 title",
    exact: true,
  });
  await title.focus();
  await expect(title).toBeFocused();
  await title.fill("Master academic vocabulary");

  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page.getByText("Đã lưu bản nháp")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(title).toHaveValue("Master academic vocabulary");

  await page
    .getByRole("checkbox", { name: "Chọn công việc: Practice speaking" })
    .uncheck();
  await page.getByRole("button", { name: "Xác nhận (1)" }).click();

  await expect(title).toBeDisabled();
  expect(actions.map((action) => action.action)).toEqual(["save", "confirm"]);
  expect(actions[1].selectedItemIds).toHaveLength(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("edits, saves draft, and immediately confirms without reloading the page", async ({
  page,
}) => {
  const { actions } = await setupUiCompositionMocks(page, {
    mode: "composed-proposal",
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();

  const title = page.getByRole("textbox", {
    name: "Task 1 title",
    exact: true,
  });
  await title.fill("Save then confirm without reload");

  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page.getByText("Đã lưu bản nháp")).toBeVisible();

  await page
    .getByRole("checkbox", { name: "Chọn công việc: Practice speaking" })
    .uncheck();
  await page.getByRole("button", { name: "Xác nhận (1)" }).click();

  await expect(title).toBeDisabled();
  expect(actions.map((action) => action.action)).toEqual(["save", "confirm"]);
  expect(actions[1].revision).toBe(2);
  expect(actions[1].selectedItemIds).toHaveLength(1);
});

test("falls back to legacy TaskProposalForm when composed proposal surface is invalid and to markdown when read-only surface is invalid", async ({
  page,
}) => {
  const { actions } = await setupUiCompositionMocks(page, {
    mode: "malformed-composed-proposal",
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();

  const title = page.getByRole("textbox", {
    name: "Task 1 title",
    exact: true,
  });
  await expect(title).toBeVisible();
  await title.fill("Recovered via legacy form");
  await page.getByRole("button", { name: "Xác nhận (2)" }).click();
  await expect(title).toBeDisabled();
  expect(actions).toHaveLength(1);

  await setupUiCompositionMocks(page, { mode: "malformed-readonly" });
  await page.reload();
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(page.getByText("Weekly Study Plan")).toBeVisible();
  await expect(page.getByText("Monday: Reading (2h)")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});
