import { expect, test } from "@playwright/test";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

test.describe("Agent Workspace E2E", () => {
  test("mobile workspace has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await agentWorkspaceFixture(page);

    await page.goto("/agent");
    await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();

    const isWithinBounds = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(isWithinBounds).toBe(true);
  });

  test("chat bubble is absent on /agent and present on other pages", async ({
    page,
  }) => {
    await agentWorkspaceFixture(page);

    // On /agent
    await page.goto("/agent");
    await expect(page.getByText("Orbit Agent", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open assistant" }),
    ).not.toBeVisible();

    // On /dashboard
    await page.goto("/dashboard");
    await expect(
      page.getByRole("button", { name: "Open assistant" }),
    ).toBeVisible();
  });

  test("preserves an unsent draft when opening Agent from the bubble", async ({
    page,
  }) => {
    await agentWorkspaceFixture(page);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open assistant" }).click();
    await page.getByRole("textbox", { name: "Message" }).fill("My unsent plan");
    await page.getByRole("button", { name: "Open in Agent" }).click();
    await expect(page).toHaveURL(/\/agent\?conversation=/);
    await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(
      "My unsent plan",
    );
  });

  test("deep link loads requested conversation directly", async ({ page }) => {
    await agentWorkspaceFixture(page, { conversationId: "conv-e2e-1" });

    await page.goto("/agent?conversation=conv-e2e-1");
    await expect(
      page.getByText(
        "I have prepared the plan and created the required tasks.",
      ),
    ).toBeVisible();
  });

  test("unowned or invalid conversation deep link displays unavailable state", async ({
    page,
  }) => {
    await agentWorkspaceFixture(page);

    await page.goto("/agent?conversation=unowned-or-invalid");
    await expect(
      page.getByRole("heading", { name: "Conversation unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start new conversation" }),
    ).toBeVisible();
  });

  test("mobile drawers open and close via Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await agentWorkspaceFixture(page);

    await page.goto("/agent");

    // Open history drawer
    const historyBtn = page.getByRole("button", {
      name: "Open conversation history",
    });
    await historyBtn.click();
    await expect(
      page.getByRole("dialog", { name: "Conversation history" }),
    ).toBeVisible();

    const dialog = page.getByRole("dialog").last();
    await expect(dialog).toContainText("Conversation History");
    const firstFocus = dialog.getByRole("textbox", {
      name: "Search conversations",
    });
    await expect(firstFocus).toBeFocused();
    const lastButton = dialog.getByRole("button").last();
    await lastButton.focus();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button").first()).toBeFocused();
    // Escape closes it
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Conversation history" }),
    ).not.toBeVisible();
    await expect(historyBtn).toBeFocused();

    // Open context drawer
    const contextBtn = page.getByRole("button", {
      name: "Open context and actions panel",
    });
    await contextBtn.click();
    await expect(
      page.getByRole("dialog", { name: "Context and verified activities" }),
    ).toBeVisible();

    // Escape closes it
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Context and verified activities" }),
    ).not.toBeVisible();
  });

  test("displays confirmed activities and updates project context", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await agentWorkspaceFixture(page, {
      conversationId: "conv-e2e-1",
      activities: [
        {
          id: "act-1",
          requestId: "req-1",
          toolCallId: "call-1",
          kind: "task_created",
          status: "succeeded",
          title: "Create project structure",
          resourceType: "task",
          resourceId: "1",
          occurredAt: "2026-11-06T00:00:00.000Z",
        },
      ],
    });

    await page.goto("/agent?conversation=conv-e2e-1");

    // Activity is visible
    await expect(page.getByText("Create project structure")).toBeVisible();
    await expect(page.getByText("Success")).toBeVisible();

    // Project context select
    const projectSelect = page.getByLabel("Project Context");
    await expect(projectSelect).toBeVisible();
    await projectSelect.selectOption({ label: "Website refresh" });
    await expect(projectSelect).toHaveValue("website");
  });
});
