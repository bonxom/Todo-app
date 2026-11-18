import { test, expect } from "@playwright/test";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

for (const theme of ["light", "dark"] as const) {
  test(`Agents controls and messages use Orbit palette in ${theme}`, async ({
    page,
  }) => {
    await agentWorkspaceFixture(page);
    await page.addInitScript(
      (value) => localStorage.setItem("orbit-theme", value),
      theme,
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/v2/agents");
    await expect(
      page
        .locator(".v2-agent-center")
        .getByText("I have prepared the plan and created the required tasks."),
    ).toBeVisible();
    const newChat = page.getByRole("button", {
      name: "New conversation",
      exact: true,
    });
    const accent = await page.locator(".v2-agents").evaluate((el) => {
      const probe = document.createElement("span");
      probe.style.color = "var(--v2-accent)";
      el.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    await expect(newChat).toHaveCSS("background-color", accent);
    await expect(page.locator(".chat-message--user").first()).toHaveCSS(
      "background-color",
      accent,
    );
    await expect(page.locator('.v2-agents img[src*="pinimg"]')).toHaveCount(0);
    await expect(page.locator(".v2-agent-context")).not.toContainText(
      "{{title}}",
    );
    await page.screenshot({
      path: `/tmp/v2-agents-review/desktop-${theme}.png`,
      fullPage: true,
    });
    if (theme === "dark") {
      await page.getByRole("button", { name: "Language", exact: true }).click();
      await expect(
        page.getByRole("region", { name: "Hội thoại với trợ lý", exact: true }),
      ).toBeVisible();
      await expect(
        page
          .locator(".v2-agent-context")
          .getByText("Đã tạo công việc", { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: "/tmp/v2-agents-review/desktop-vi-dark.png",
        fullPage: true,
      });
    }
  });
}

test("Mobile panels do not overlap and Escape returns focus", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v2/agents");
  const history = page.getByRole("button", {
    name: "Conversations",
    exact: true,
  });
  const context = page.getByRole("button", {
    name: "Context and activity",
    exact: true,
  });
  await history.click();
  await expect(page.locator(".v2-agent-history")).toBeVisible();
  await context.click();
  await expect(page.locator(".v2-agent-context")).toBeVisible();
  await expect(page.locator(".v2-agent-history")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Close context panel", exact: true })
    .focus();
  await page.keyboard.press("Escape");
  await expect(page.locator(".v2-agent-context")).not.toBeVisible();
  await expect(context).toBeFocused();
  await history.click();
  await page
    .getByRole("textbox", { name: /search conversations/i })
    .fill("Personal");
  await expect(
    page.getByRole("button", { name: /Personal conversation/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /E2E Workspace Planning/ }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(history).toBeFocused();
  await page.screenshot({
    path: "/tmp/v2-agents-review/mobile.png",
    fullPage: true,
  });
});

test("History failure is actionable and preserves the active conversation", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  let fail = true;
  await page.route("**/api/ai/conversations", (route) =>
    route.request().method() === "GET" && fail
      ? route.fulfill({ status: 500, json: { message: "History unavailable" } })
      : route.fallback(),
  );
  await page.goto("/v2/agents");
  const history = page.locator(".v2-agent-history");
  await expect(history.getByRole("alert")).toContainText(
    "Unable to load previous conversations.",
  );
  await expect(
    page
      .locator(".v2-agent-center")
      .getByText("I have prepared the plan and created the required tasks."),
  ).toBeVisible();
  fail = false;
  await history.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    history.getByRole("button", { name: /E2E Workspace Planning/ }),
  ).toBeVisible();
});

test("Send and project context work with the revised Agents presentation", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.goto("/v2/agents");
  await page.setViewportSize({ width: 1440, height: 900 });
  const composer = page.locator(".v2-agent-center textarea");
  await composer.fill("Review my priority tasks");
  await composer.press("Enter");
  await expect(
    page
      .locator(".v2-agent-center")
      .getByText("Phản hồi mẫu từ Orbit Agent cho: Review my priority tasks", {
        exact: true,
      }),
  ).toBeVisible();
  await expect(composer).toHaveValue("");
  const project = page.locator(
    '.v2-agent-context [data-testid="custom-select-trigger"]',
  );
  await expect(project).toBeEnabled();
  await project.click();
  const triggerFill = await project.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  await expect(
    page.getByRole("listbox", { name: "Project context" }),
  ).toHaveCSS("background-color", triggerFill);
  const option = page.getByRole("listbox").getByRole("option", {
    name: "Website refresh",
    exact: true,
  });
  await option.click();
  await expect(project).toContainText("Website refresh");
  await page.screenshot({
    path: "/tmp/v2-agents-review/sent.png",
    fullPage: true,
  });
});

for (const width of [320, 768, 1024]) {
  test(`Long messages and context remain contained at ${width}px`, async ({
    page,
  }) => {
    await agentWorkspaceFixture(page, {
      initialMessages: [
        {
          id: "long-answer",
          sender: "bot",
          timestamp: "2026-11-18T12:00:00Z",
          text:
            "## Your priorities\n\n" +
            "ProjectWithoutSpaces".repeat(35) +
            "\n\n```js\nconst task = { description: '" +
            "long value ".repeat(30) +
            "' };\n```",
        },
      ],
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/v2/agents");
    await expect(
      page
        .locator(".v2-agent-center")
        .getByRole("heading", { name: "Your priorities" }),
    ).toBeVisible();
    const composer = page.locator(".v2-agent-center textarea");
    await composer.fill(
      "A draft that should survive opening the context panel",
    );
    const toggle = page.getByRole("button", {
      name: "Context and activity",
      exact: true,
    });
    if (await toggle.isVisible()) {
      await toggle.click();
      await page
        .getByRole("button", { name: "Close context panel", exact: true })
        .click();
    }
    await expect(composer).toHaveValue(
      "A draft that should survive opening the context panel",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/v2-agents-review/width-${width}.png`,
      fullPage: true,
    });
  });
}

test("Empty conversation has one set of starters and focuses the composer", async ({
  page,
}) => {
  await agentWorkspaceFixture(page, { initialMessages: [] });
  await page.goto("/v2/agents");
  await expect(page.locator(".v2-agent-starters")).toBeVisible();
  await expect(page.locator(".v2-agents .chat-welcome")).toHaveCount(0);
  const starter = page.locator(".v2-agent-starters button").first();
  const prompt = await starter.innerText();
  await starter.click();
  const composer = page.locator(".v2-agent-center textarea");
  await expect(composer).toHaveValue(prompt);
  await expect(composer).toBeFocused();
  await page.screenshot({
    path: "/tmp/v2-agents-review/empty.png",
    fullPage: true,
  });
});

test("Switching conversations asks before discarding a draft", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/agents");
  const composer = page.locator(".v2-agent-center textarea");
  await composer.fill("Keep this draft");
  await page
    .getByRole("button", { name: "Personal conversation", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Keep editing", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(composer).toHaveValue("Keep this draft");
  await expect(
    page
      .locator(".v2-agent-center")
      .getByText("I have prepared the plan and created the required tasks."),
  ).toBeVisible();
});
