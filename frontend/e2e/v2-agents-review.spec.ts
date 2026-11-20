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
    await page.goto("/v2/agents?conversation=conv-e2e-1");
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
    await expect(
      page.getByRole("button", { name: "Context and activity" }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `/tmp/v2-agents-review/desktop-${theme}.png`,
      fullPage: true,
    });
    if (theme === "dark") {
      await page.getByRole("button", { name: "Language", exact: true }).click();
      await expect(
        page.getByRole("region", { name: "Hội thoại với trợ lý", exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: "/tmp/v2-agents-review/desktop-vi-dark.png",
        fullPage: true,
      });
    }
  });
}

test("Mobile history is searchable and Escape returns focus", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/v2/agents");
  const history = page.getByRole("button", {
    name: "Show chats",
    exact: true,
  });
  await history.click();
  await expect(page.locator(".v2-agent-history")).toBeVisible();
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
  await page.goto("/v2/agents?conversation=conv-e2e-1");
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

test("Send works in the revised Agents workspace", async ({ page }) => {
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
  await page.screenshot({
    path: "/tmp/v2-agents-review/sent.png",
    fullPage: true,
  });
});

for (const width of [320, 768, 1024]) {
  test(`Long messages and the chat drawer remain contained at ${width}px`, async ({
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
    await page.goto("/v2/agents?conversation=conv-e2e-1");
    await expect(
      page
        .locator(".v2-agent-center")
        .getByRole("heading", { name: "Your priorities" }),
    ).toBeVisible();
    const composer = page.locator(".v2-agent-center textarea");
    const draft = "A draft that should survive toggling the chat drawer";
    await composer.fill(draft);
    const toggle = page.getByRole("button", { name: /^(Show|Hide) chats$/ });
    const wasOpen = (await toggle.getAttribute("aria-expanded")) === "true";
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", String(!wasOpen));
    await toggle.click();
    await expect(composer).toHaveValue(draft);
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
  await page.goto("/v2/agents?conversation=conv-e2e-1");
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

test("An active V2 chat uses the full conversation width with readable replies", async ({
  page,
}) => {
  await agentWorkspaceFixture(page, {
    initialMessages: [
      {
        id: "message-user",
        sender: "user",
        text: "Lập kế hoạch tuần tới",
        timestamp: "2026-11-20T07:00:00Z",
      },
      {
        id: "message-agent",
        sender: "bot",
        text: "## Kế hoạch tuần tới\n\nBắt đầu bằng việc chọn một kết quả cụ thể cho mỗi dự án. Ưu tiên các việc có hạn gần và giữ một khoảng trống để xử lý việc phát sinh.\n\n- **Thứ Hai.** Rà soát các việc còn mở, chốt các mốc quan trọng và sắp lịch cho hai việc cần tập trung nhất.\n- **Thứ Ba và thứ Tư.** Hoàn thành phần việc chính rồi cập nhật tiến độ cho nhóm.\n- **Cuối tuần.** Kiểm tra kết quả và ghi lại các việc sẽ chuyển sang tuần sau.",
        timestamp: "2026-11-20T07:01:00Z",
      },
    ],
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2/agents?conversation=conv-e2e-1");
  const workspace = page.getByRole("region", { name: "Agent conversation" });
  const composer = workspace.locator(".agent-workspace-composer");
  const reply = workspace.locator(".chat-message-row--agent").first();
  await expect(
    reply.getByRole("heading", { name: "Kế hoạch tuần tới" }),
  ).toBeVisible();
  await expect(reply.getByText("Orbit Agent", { exact: true })).toBeVisible();
  const workspaceBox = (await workspace.boundingBox())!;
  expect((await composer.boundingBox())!.width).toBeGreaterThan(
    workspaceBox.width * 0.95,
  );
  expect((await reply.boundingBox())!.width).toBeGreaterThan(
    workspaceBox.width * 0.9,
  );
  await expect(reply.getByText(/Bắt đầu bằng việc chọn/)).toHaveCSS(
    "font-size",
    "15px",
  );
  await expect(reply.getByRole("list").first()).toHaveCSS("font-size", "15px");
  await expect(
    workspace.getByText("Lập kế hoạch tuần tới", { exact: true }),
  ).toHaveCSS("font-size", "15px");

  await page.mouse.move(1439, 1);
  await page.screenshot({
    path: "/tmp/orbit-chat-review/v2-active-desktop.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    workspace.getByRole("button", { name: "Send message" }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.mouse.move(389, 1);
  await page.screenshot({
    path: "/tmp/orbit-chat-review/v2-active-mobile.png",
    animations: "disabled",
  });
});
