import { expect, test } from "@playwright/test";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

for (const route of ["/agent", "/v2/agents"]) {
  test(`${route} opens blank and preserves explicit conversation links`, async ({
    page,
  }) => {
    await agentWorkspaceFixture(page);
    await page.goto(route);
    const workspace = page.getByRole("region", { name: "Agent conversation" });
    const message = workspace.getByRole("textbox", { name: "Message" });
    const reply = workspace.getByText(
      "I have prepared the plan and created the required tasks.",
    );
    await expect(message).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(reply).toHaveCount(0);
    await expect(workspace.locator(".chat-welcome")).toHaveCount(0);

    await page.goto(`${route}?conversation=conv-e2e-1`);
    await expect(reply).toBeVisible();
    await page
      .getByRole("link", {
        name: route === "/agent" ? "Agent" : "Agents",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(reply).toHaveCount(0);
  });
}

test("Projects groups chats and scopes the first send without creating an empty chat", async ({
  page,
}) => {
  await agentWorkspaceFixture(page, { contextProjectId: "website" });
  let createdWith: string | undefined;
  let createdCount = 0;
  await page.route("**/api/ai/conversations", async (route) => {
    if (route.request().method() === "POST") {
      createdCount++;
      createdWith = route.request().postDataJSON().projectId;
    }
    await route.fallback();
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/agents");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Website refresh", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Website refresh" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "E2E Workspace Planning", exact: true }),
  ).toBeVisible();
  expect(createdCount).toBe(0);

  const composer = page.getByRole("textbox", { name: "Message" });
  const startPosition = (await composer.boundingBox())!.y;
  await composer.fill("Plan the launch");
  await composer.press("Enter");
  await expect(
    page
      .getByRole("region", { name: "Agent conversation" })
      .getByText("Phản hồi mẫu từ Orbit Agent cho: Plan the launch"),
  ).toBeVisible();
  expect(createdWith).toBe("website");
  await expect(page).toHaveURL(/conversation=/);
  await expect(
    page.getByRole("heading", { name: "Website refresh" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Plan the launch", exact: true }),
  ).toBeVisible();
  expect((await composer.boundingBox())!.y).toBeGreaterThan(startPosition + 80);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Website refresh" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Agent conversation" })
      .getByText("Phản hồi mẫu từ Orbit Agent cho: Plan the launch"),
  ).toBeVisible();
});

for (const [width, theme] of [
  [1440, "light"],
  [1440, "dark"],
  [768, "light"],
  [390, "dark"],
  [320, "light"],
] as const) {
  test(`V2 new chat is usable at ${width}px in ${theme}`, async ({ page }) => {
    await agentWorkspaceFixture(page, { contextProjectId: "website" });
    await page.addInitScript(
      (value) => localStorage.setItem("orbit-theme", value),
      theme,
    );
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/v2/agents");
    const center = page.getByRole("region", { name: "Agent conversation" });
    const message = center.getByRole("textbox", { name: "Message" });
    const starters = center.locator(".v2-agent-starters");
    await expect(message).toBeInViewport();
    await expect(starters.getByRole("button")).toHaveCount(3);
    expect((await message.boundingBox())!.y).toBeLessThan(
      (await starters.boundingBox())!.y,
    );
    if (width <= 768) {
      const history = page.getByRole("button", { name: "Show chats" });
      if (await history.isVisible()) {
        const chatColumn = page.locator(".v2-agent-center");
        const before = await chatColumn.boundingBox();
        await history.click();
        const after = await chatColumn.boundingBox();
        expect([after?.x, after?.width]).toEqual([before?.x, before?.width]);
        await expect(
          page.getByRole("textbox", { name: /search conversations/i }),
        ).toBeFocused();
      }
    }
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    if (width === 390) {
      await expect(
        page.getByRole("button", { name: "Website refresh", exact: true }),
      ).toBeVisible();
      await page.mouse.move(width - 4, 4);
      await page.screenshot({
        path: "/tmp/orbit-chat-review/v2-390-projects.png",
        animations: "disabled",
      });
    }
    await page
      .getByRole("button", { name: "Website refresh", exact: true })
      .click();
    await expect(
      center.getByRole("heading", { name: "Website refresh" }),
    ).toBeVisible();
    await expect(message).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.mouse.move(width - 4, 4);
    await page.screenshot({
      path: `/tmp/orbit-chat-review/v2-${width}-${theme}.png`,
      animations: "disabled",
    });
    await expect(
      center.getByRole("button", { name: "Attach file" }),
    ).toBeInViewport();
    await expect(
      center.getByRole("button", { name: "Attach image" }),
    ).toBeInViewport();
    await expect(
      center.getByRole("button", { name: "Agent mode: auto" }),
    ).toBeInViewport();
    if (width === 390) {
      await page.getByRole("button", { name: "Language", exact: true }).click();
      await expect(
        page
          .getByRole("region", { name: "Hội thoại với trợ lý" })
          .getByRole("heading", { name: "Bạn cần Orbit giúp gì?" }),
      ).toBeVisible();
      await page.screenshot({
        path: "/tmp/orbit-chat-review/v2-390-vi-dark.png",
        animations: "disabled",
      });
    }
  });
}

test("V2 creates a project from the chat sidebar and opens a blank chat in it", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  let created: { _id: string; name: string; status: string } | undefined;
  await page.route("**/api/projects", async (route) => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      created = { ...payload, _id: "launch", status: "active" };
      await route.fulfill({ status: 201, json: created });
    } else if (created) {
      await route.fulfill({ json: [created] });
    } else await route.fallback();
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/agents");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add project" });
  await dialog
    .getByRole("textbox", { name: /project name/i })
    .fill("Launch checklist");
  await dialog.getByRole("button", { name: /^add project$/i }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\?project=launch$/);
  await expect(
    page.getByRole("heading", { name: "Launch checklist" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Agent conversation" })
      .getByRole("textbox", { name: "Message" }),
  ).toHaveValue("");
});

test("V2 gives an unavailable project URL a way back to a blank chat", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.goto("/v2/agents?project=missing");
  const center = page.getByRole("region", { name: "Agent conversation" });
  await expect(center.getByRole("alert")).toContainText(
    "This project is unavailable.",
  );
  await expect(center.getByRole("textbox", { name: "Message" })).toHaveCount(0);
  await center.getByRole("button", { name: "Start new conversation" }).click();
  await expect(page).toHaveURL(/\/v2\/agents$/);
  await expect(center.getByRole("textbox", { name: "Message" })).toBeVisible();
});

for (const [route, label] of [
  ["/agent", "Agent"],
  ["/v2/agents", "Agents"],
] as const) {
  test(`${route} protects a blank chat draft when Agent is selected again`, async ({
    page,
  }) => {
    await agentWorkspaceFixture(page);
    await page.goto(route);
    const message = page.getByRole("textbox", { name: "Message" });
    const entry = page.getByRole("link", { name: label, exact: true });
    const discard = page.getByTestId("discard-dialog");
    await message.fill("An unsent draft");
    await entry.click();
    await expect(discard).toBeVisible();
    await discard.getByRole("button", { name: "Keep editing" }).click();
    await expect(message).toHaveValue("An unsent draft");
    await entry.click();
    await discard.getByRole("button", { name: "Discard changes" }).click();
    await expect(message).toHaveValue("");
  });
}

test("V2 New chat clears a skill selected in a blank composer", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.goto("/v2/agents");
  const message = page.getByRole("textbox", { name: "Message" });
  await message.fill("/");
  await page.getByRole("option").first().click();
  const skill = page.getByRole("button", { name: /remove skill/i });
  await expect(skill).toBeVisible();
  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(skill).toHaveCount(0);
  await expect(message).toBeVisible();
});

test("Escape closes the project form before the mobile chat drawer", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v2/agents");
  await page.getByRole("button", { name: "Show chats" }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const add = page.getByRole("button", { name: "Add project", exact: true });
  await add.click();
  const dialog = page.getByRole("dialog", { name: "Add project" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(add).toBeFocused();
});

test("V2 can start a project chat while chat history is unavailable", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.route("**/api/ai/conversations", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ status: 500, json: { message: "History unavailable" } })
      : route.fallback(),
  );
  await page.goto("/v2/agents");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(
    page.getByText("Unable to load previous conversations."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Website refresh", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Website refresh" }),
  ).toBeVisible();
});

for (const [dashboard, destination, handoff] of [
  ["/dashboard", "/agent", "Open in Agent"],
  ["/v2/dashboard", "/v2/agents", "Open in Agents"],
] as const) {
  test(`${destination} keeps a first message sent during assistant handoff`, async ({
    page,
  }) => {
    await agentWorkspaceFixture(page);
    await page.route("**/api/ai/conversations/latest", (route) =>
      route.fulfill({ json: { data: null } }),
    );
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/ai/conversations", async (route) => {
      if (route.request().method() === "POST") await hold;
      await route.fallback();
    });
    await page.goto(dashboard);
    await page
      .getByRole("button", { name: "Open assistant", exact: true })
      .click();
    const message = page.getByRole("textbox", { name: "Message" });
    await message.fill("Keep the handoff");
    const creating = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.url().endsWith("/api/ai/conversations"),
    );
    await message.press("Enter");
    await creating;
    await page.getByRole("button", { name: handoff, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    release();
    await expect(page).toHaveURL(/conversation=/);
    await expect(
      page
        .getByRole("region", { name: "Agent conversation" })
        .getByText("Phản hồi mẫu từ Orbit Agent cho: Keep the handoff"),
    ).toBeVisible();
  });
}

test("V2 carries a blank project's draft through the floating assistant", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.goto("/v2/agents?project=website");
  const center = page.getByRole("region", { name: "Agent conversation" });
  await center
    .getByRole("textbox", { name: "Message" })
    .fill("Keep my project draft");
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open assistant", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open in Agents", exact: true })
    .click();
  await expect(page).toHaveURL(/\/v2\/agents\?project=website$/);
  await expect(
    center.getByRole("heading", { name: "Website refresh" }),
  ).toBeVisible();
  await expect(center.getByRole("textbox", { name: "Message" })).toHaveValue(
    "Keep my project draft",
  );
});

test("All projects clears the active project and starts an unscoped chat", async ({
  page,
}) => {
  await agentWorkspaceFixture(page, { contextProjectId: "website" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/agents?project=website");
  const center = page.getByRole("region", { name: "Agent conversation" });
  const project = page.getByRole("button", {
    name: "Website refresh",
    exact: true,
  });
  const allProjects = page.getByRole("button", {
    name: "All projects",
    exact: true,
  });
  const message = center.getByRole("textbox", { name: "Message" });
  await expect(project).toHaveAttribute("aria-current", "true");
  await message.fill("Keep this project draft");
  await allProjects.click();
  const discard = page.getByTestId("discard-dialog");
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Keep editing" }).click();
  await expect(message).toHaveValue("Keep this project draft");
  await allProjects.click();
  await discard.getByRole("button", { name: "Discard changes" }).click();
  await expect(page).toHaveURL(/\/v2\/agents$/);
  await expect(project).not.toHaveAttribute("aria-current");
  await expect(center.getByRole("heading", { name: "New chat" })).toBeVisible();

  const create = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().endsWith("/api/ai/conversations"),
  );
  await message.fill("Start a general chat");
  await message.press("Enter");
  expect((await create).postDataJSON()).not.toHaveProperty("projectId");
  await expect(
    center.getByText("Phản hồi mẫu từ Orbit Agent cho: Start a general chat"),
  ).toBeVisible();
});

test("Agent V2 shows the tools and glass pills without a context panel", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/agents?project=website");
  const center = page.getByRole("region", { name: "Agent conversation" });
  await expect(
    page.getByRole("button", { name: "Context and activity" }),
  ).toHaveCount(0);
  await expect(
    center.getByRole("button", { name: "Options", exact: true }),
  ).toHaveCount(0);
  await expect(
    center.getByRole("button", { name: "Attach file" }),
  ).toBeVisible();
  await expect(
    center.getByRole("button", { name: "Attach image" }),
  ).toBeVisible();
  await center.getByRole("button", { name: "Agent mode: auto" }).click();
  await expect(
    center.getByRole("button", { name: "Agent mode: ask" }),
  ).toHaveAttribute("aria-pressed", "true");
  const topbar = page.getByRole("button", { name: "Language", exact: true });
  const glass = await topbar.evaluate((button) => {
    const style = getComputedStyle(button);
    return { radius: style.borderTopLeftRadius, fill: style.backgroundImage };
  });
  const recent = page.getByRole("button", { name: "Recent", exact: true });
  await expect(recent).toHaveCSS("border-top-left-radius", glass.radius);
  await expect(recent).toHaveCSS("background-image", glass.fill);
});
