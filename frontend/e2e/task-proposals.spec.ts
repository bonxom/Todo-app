import { test, expect } from "@playwright/test";
import { setupTaskProposalMocks } from "./task-proposals.fixture";

test("edits, saves, reloads and confirms a subset through the real A2UI renderer", async ({
  page,
}) => {
  const { actions } = await setupTaskProposalMocks(page);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(
    page.getByRole("button", { name: "Plan tasks", exact: true }),
  ).toHaveCount(0);
  const title = page.getByRole("textbox", {
    name: "Task 1 title",
    exact: true,
  });
  await title.fill("Master vocabulary");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(title).toHaveValue("Master vocabulary");
  await page
    .getByRole("checkbox", { name: "Select task: Practice speaking" })
    .uncheck();
  await page.getByRole("button", { name: "Confirm (1)" }).click();
  await expect(title).toBeDisabled();
  expect(actions.map((action) => action.action)).toEqual(["save", "confirm"]);
  expect(actions[1].selectedItemIds).toHaveLength(1);
});

test("retries a lost confirmation response with the exact original request", async ({
  page,
}) => {
  const { actions } = await setupTaskProposalMocks(page, true);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();
  await page.getByRole("button", { name: "Confirm (2)" }).click();
  await page.getByRole("button", { name: "Retry request" }).click();
  await expect(
    page.getByRole("textbox", { name: "Task 1 title", exact: true }),
  ).toBeDisabled();
  expect(actions).toHaveLength(2);
  expect(actions[1]).toEqual(actions[0]);
});

test("warns before leaving dirty edits and locks cancelled proposals on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupTaskProposalMocks(page);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();
  await page
    .getByRole("textbox", { name: "Task 1 title", exact: true })
    .fill("Changed title");
  await page.getByRole("button", { name: "Close chat", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Task 1 title", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("receives an interactive proposal after an ordinary chat request", async ({
  page,
}) => {
  const { chatRequests } = await setupTaskProposalMocks(page, false, true);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(page.getByRole("button", { name: "Plan tasks" })).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Message" })
    .fill("Đề xuất hai việc để học tiếng Anh");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByRole("textbox", { name: "Task 1 title", exact: true }),
  ).toBeVisible();
  expect(chatRequests).toHaveLength(1);
  expect(chatRequests[0]).not.toHaveProperty("intent");
  await expect(page.getByRole("button", { name: "Confirm (2)" })).toBeEnabled();
});
