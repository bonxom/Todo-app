import { test, expect } from "@playwright/test";
import { installV2Fixture } from "./frontend-v2.fixture";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

test.describe("Frontend V2 Liquid Glass & Coexistence", () => {
  test("URL wins over preference and switching is bidirectional", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
      preferredVersion: "v2",
      language: "en",
    });

    // Explicit V1 URL wins over V2 preference
    await page.goto("/dashboard");
    const tryV2Btn = page.getByRole("button", { name: "Try V2", exact: true });
    await expect(tryV2Btn).toBeVisible();

    // Click Try V2
    await tryV2Btn.click();
    await expect(page).toHaveURL(/\/v2\/dashboard$/);

    // Switch back to V1
    const backToV1Btn = page.getByRole("button", {
      name: "Back to V1",
      exact: true,
    });
    await expect(backToV1Btn).toBeVisible();
    await backToV1Btn.click();
    await expect(page).toHaveURL(/\/dashboard$/);

    expect(
      await page.evaluate(() => localStorage.getItem("orbit.ui-version")),
    ).toBe("v1");

    // History Back returns to V2 dashboard
    await page.goBack();
    await expect(page).toHaveURL(/\/v2\/dashboard$/);
  });

  test("Task deep links offer native editing without crossing versions", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
      preferredVersion: "v2",
    });
    const taskId = "507f1f77bcf86cd799439001";
    await page.goto(`/v2/dashboard?taskId=${taskId}`);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("link", { name: /V1/i })).toHaveCount(0);
    await page.getByRole("button", { name: "Edit task", exact: true }).click();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
      "Task Item 1",
    );
    await expect(page).toHaveURL(
      new RegExp(`/v2/dashboard\\?taskId=${taskId}$`),
    );
  });

  test("Falls back to V2 dashboard without state from unsupported V1 page", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
    });

    await page.goto("/calendar?view=week#today");
    const tryV2Btn = page.getByRole("button", { name: "Try V2", exact: true });
    await tryV2Btn.click();

    await expect(page).toHaveURL(/\/v2\/dashboard$/);
  });

  test("Renders V2 404 with the shared version switcher for unknown V2 path", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
    });

    await page.goto("/v2/unknown-route");
    await expect(page.getByTestId("v2-not-found-page")).toBeVisible();
    await expect(page.getByText(/404|Page not found/i)).toBeVisible();

    const backLink = page.getByRole("button", { name: /Back to V1/i });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("Redirects guest to login and restores return destination after login", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: false,
    });

    // Guest attempts to enter /v2/dashboard
    await page.goto("/v2/dashboard");
    await expect(page).toHaveURL(/\/login$/);

    // Submit login form
    await page.getByLabel(/Email/i).fill("test@example.com");
    await page.getByLabel(/^Password$/i).fill("password123");
    await page.locator("button[type='submit']").click();

    // Destination /v2/dashboard restored
    await expect(page).toHaveURL(/\/v2\/dashboard$/);
  });

  test("V2 dashboard interactions: summary, search, filter, pagination, details, and status actions", async ({
    page,
  }) => {
    await installV2Fixture(page, {
      authenticated: true,
      preferredVersion: "v2",
    });

    await page.goto("/v2/dashboard");

    // 1. Summary stats
    await expect(page.getByText("15", { exact: true })).toBeVisible(); // Total tasks count

    // 2. Initial tasks
    await expect(
      page.getByRole("button", { name: "Task Item 1", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Task Item 10", exact: true }),
    ).toBeVisible();

    // 3. Pagination to page 2
    const nextBtn = page.getByRole("button", { name: "Next" });
    await nextBtn.click();
    await expect(page.getByText("Task Item 11")).toBeVisible();
    await expect(page.getByText("Task Item 15")).toBeVisible();

    // Previous button back to page 1
    const prevBtn = page.getByRole("button", { name: "Previous" });
    await prevBtn.click();
    await expect(
      page.getByRole("button", { name: "Task Item 1", exact: true }),
    ).toBeVisible();

    // 4. Search
    const searchInput = page.getByPlaceholder(/Search tasks/i);
    await searchInput.fill("Item 7");
    await searchInput.press("Enter");
    await expect(page.getByText("Task Item 7")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Task Item 1", exact: true }),
    ).not.toBeVisible();

    // Clear search
    await searchInput.fill("");
    await searchInput.press("Enter");
    await expect(
      page.getByRole("button", { name: "Task Item 1", exact: true }),
    ).toBeVisible();

    // 5. Status filter
    const statusSelect = page.getByLabel(/Filter by status/i);
    await statusSelect.selectOption("in-progress");
    await expect(page.getByText("Task Item 4")).toBeVisible();

    // Reset status filter
    await statusSelect.selectOption("");
    await expect(
      page.getByRole("button", { name: "Task Item 1", exact: true }),
    ).toBeVisible();

    // 6. Start action on pending task
    const pendingTaskRow = page.getByRole("listitem").filter({
      has: page.getByRole("button", { name: "Task Item 7", exact: true }),
    });
    await pendingTaskRow
      .getByRole("button", { name: "Start", exact: true })
      .click();
    await expect(
      pendingTaskRow.getByRole("button", { name: "Finish", exact: true }),
    ).toBeVisible();

    // 7. Open details dialog
    await page
      .getByRole("button", { name: "Task Item 1", exact: true })
      .click();
    await expect(page).toHaveURL(/taskId=507f1f77bcf86cd799439001/);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Description for task item 1")).toBeVisible();

    // Close details dialog
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(page).toHaveURL(/\/v2\/dashboard$/);
    await expect(dialog).not.toBeVisible();
  });

  test("V2 Dashboard Command Center layout and Chat Now handoff to Agents", async ({
    page,
  }) => {
    await agentWorkspaceFixture(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/v2/dashboard");

    const focusStrip = page.getByTestId("v2-dashboard-focus");
    const chatNow = page.getByTestId("v2-dashboard-chat-now");
    const projectsRail = page.getByTestId("v2-dashboard-projects-rail");
    const taskPanel = page.locator(".v2-workspace-panel");

    await expect(focusStrip).toBeVisible();
    await expect(chatNow).toBeVisible();
    await expect(projectsRail).toBeVisible();
    await expect(taskPanel).toBeVisible();

    // Verify Chat Now sits between Today's Focus and (Projects + Task List)
    const focusBox = (await focusStrip.boundingBox())!;
    const chatNowBox = (await chatNow.boundingBox())!;
    const projectsBox = (await projectsRail.boundingBox())!;
    expect(focusBox.y + focusBox.height).toBeLessThanOrEqual(chatNowBox.y + 4);
    expect(chatNowBox.y + chatNowBox.height).toBeLessThanOrEqual(
      projectsBox.y + 4,
    );

    await page.screenshot({
      path: "artifacts/dashboard-command-center/dashboard-light.png",
      fullPage: true,
    });

    // Send a message in Chat Now -> navigates immediately to /v2/agents and streams reply
    const chatNowInput = chatNow.getByRole("textbox");
    await chatNowInput.fill("Plan my afternoon priorities");
    await chatNowInput.press("Enter");

    await expect(page).toHaveURL(/\/v2\/agents/);
    const agentCenter = page.locator(".v2-agent-center");
    await expect(agentCenter).toHaveAttribute("data-chat-stage", "active");
    await expect(
      agentCenter.getByText("Plan my afternoon priorities", { exact: true }),
    ).toBeVisible();
    await expect(
      agentCenter.getByText(
        "Phản hồi mẫu từ Orbit Agent cho: Plan my afternoon priorities",
        { exact: true },
      ),
    ).toBeVisible();

    await page.screenshot({
      path: "artifacts/dashboard-command-center/agents-after-handoff.png",
      fullPage: true,
    });
  });
});
