import { test, expect } from "@playwright/test";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

const OUT = "/tmp/agent-process-audit";

test("V2 Agents shows live thinking & tool processes, then auto-collapses into a toggleable summary", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  const convId = "conv-e2e-1";
  const turnId = "turn-stream-1";
  let turnDone = false;

  const reasoningBlocks = [
    {
      blockId: `${turnId}:r0`,
      text: "First I should review the user's open tasks before proposing a focused schedule.",
      order: 1,
    },
  ];

  const toolProgress = [
    {
      toolCallId: "tc-list",
      toolName: "orbit_list_tasks",
      label: "Đang tìm kiếm công việc",
      status: "succeeded" as const,
      summary: "Đã tìm kiếm công việc",
      order: 2,
    },
    {
      toolCallId: "tc-propose",
      toolName: "propose_tasks",
      label: "Đang chuẩn bị đề xuất công việc",
      status: "succeeded" as const,
      summary: "Đã chuẩn bị đề xuất công việc",
      order: 4,
    },
  ];

  // Override /turns and /stream routes on top of fixture
  await page.route(`**/api/ai/conversations/${convId}**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === `/api/ai/conversations/${convId}/turns` && method === "POST") {
      return route.fulfill({
        status: 202,
        json: {
          data: {
            turnId,
            conversationId: convId,
            requestId: "req-stream-1",
            status: "processing",
            partialResponse: "",
            lastEventSeq: 0,
            toolProgress: [],
            deadlineAt: new Date(Date.now() + 300_000).toISOString(),
          },
        },
      });
    }

    if (
      path === `/api/ai/conversations/${convId}/turns/${turnId}/events` &&
      method === "GET"
    ) {
      // Wait briefly so we can assert the initial "Thinking..." state before tools stream in
      await new Promise((r) => setTimeout(r, 450));
      turnDone = true;
      const now = new Date().toISOString();
      const body = [
        `id: 1\nevent: reasoning.delta\ndata: ${JSON.stringify({ version: 1, turnId, seq: 1, occurredAt: now, payload: { blockId: `${turnId}:r0`, text: "First I should review the user's open tasks before proposing a focused schedule." } })}\n\n`,
        `id: 2\nevent: tool.started\ndata: ${JSON.stringify({ version: 1, turnId, seq: 2, occurredAt: now, payload: { toolCallId: "tc-list", toolName: "orbit_list_tasks", label: "Đang tìm kiếm công việc" } })}\n\n`,
        `id: 3\nevent: tool.finished\ndata: ${JSON.stringify({ version: 1, turnId, seq: 3, occurredAt: now, payload: { toolCallId: "tc-list", toolName: "orbit_list_tasks", status: "succeeded", summary: "Đã tìm kiếm công việc" } })}\n\n`,
        `id: 4\nevent: tool.started\ndata: ${JSON.stringify({ version: 1, turnId, seq: 4, occurredAt: now, payload: { toolCallId: "tc-propose", toolName: "propose_tasks", label: "Đang chuẩn bị đề xuất công việc" } })}\n\n`,
        `id: 5\nevent: tool.finished\ndata: ${JSON.stringify({ version: 1, turnId, seq: 5, occurredAt: now, payload: { toolCallId: "tc-propose", toolName: "propose_tasks", status: "succeeded", summary: "Đã chuẩn bị đề xuất công việc" } })}\n\n`,
        `id: 6\nevent: assistant.delta\ndata: ${JSON.stringify({ version: 1, turnId, seq: 6, occurredAt: now, payload: { messageId: `${turnId}:bot`, text: "I reviewed your 7 tasks and prepared a focused schedule." } })}\n\n`,
        `id: 7\nevent: turn.finished\ndata: ${JSON.stringify({ version: 1, turnId, seq: 7, occurredAt: now, payload: { status: "completed", result: { response: "I reviewed your 7 tasks and prepared a focused schedule." } } })}\n\n`,
      ].join("");

      return route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
        body,
      });
    }

    if (path === `/api/ai/conversations/${convId}` && method === "GET") {
      return route.fulfill({
        status: 200,
        json: {
          data: {
            conversationId: convId,
            title: "E2E Workspace Planning",
            mode: "auto",
            before: null,
            pending: [],
            activeRun: null,
            context: { projectId: null, available: true },
            activities: [],
            messages: [
              {
                id: "msg-1",
                sender: "user",
                text: "What is the plan for this week?",
                timestamp: "2026-11-06T00:00:00.000Z",
              },
              {
                id: "msg-2",
                sender: "bot",
                text: "I have prepared the plan and created the required tasks.",
                timestamp: "2026-11-06T00:00:05.000Z",
              },
              ...(turnDone
                ? [
                    {
                      id: `${turnId}:user`,
                      sender: "user",
                      text: "Check my tasks and plan today",
                      timestamp: "2026-11-21T04:00:00.000Z",
                    },
                    {
                      id: `${turnId}:bot`,
                      sender: "bot",
                      text: "I reviewed your 7 tasks and prepared a focused schedule.",
                      timestamp: "2026-11-21T04:00:04.000Z",
                      reasoningBlocks,
                      toolProgress,
                    },
                  ]
                : []),
            ],
          },
        },
      });
    }

    return route.fallback();
  });

  await page.goto(`/v2/agents?conversation=${convId}`);
  await page.evaluate(() => {
    localStorage.setItem("orbit.v2-palette", "ocean");
  });
  await page.reload();
  await expect(page.getByTestId("v2-agents-page")).toBeVisible();

  const input = page.getByRole("textbox", { name: "Message" });
  await input.fill("Check my tasks and plan today");
  await input.press("Enter");

  // 1. Minimal live thinking line appears immediately before first tool/token
  await expect(page.getByTestId("agent-process-live")).toBeVisible();
  await expect(page.getByTestId("agent-process-thinking-step")).toBeVisible();
  await page.screenshot({ path: `${OUT}/01-agents-live-thinking.png` });

  // 2. After stream completes & reloads persisted turn, panel auto-collapses into minimal summary toggle
  await expect(
    page.getByText("I reviewed your 7 tasks and prepared a focused schedule."),
  ).toBeVisible();
  const processToggle = page.getByTestId("agent-process-toggle");
  await expect(processToggle).toHaveAttribute("aria-expanded", "false");
  await expect(processToggle).toContainText(/Thought · Completed 2 steps/i);
  await page.screenshot({ path: `${OUT}/02-agents-completed-collapsed.png` });

  // 3. Clicking the toggle expands to reveal persisted thinking block and localized EN tool steps
  await processToggle.click();
  await expect(processToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId(`reasoning-block-${turnId}:r0`)).toContainText(
    "First I should review the user's open tasks before proposing a focused schedule.",
  );
  await expect(page.getByTestId("tool-progress-tc-list")).toHaveText(
    "Searched tasks",
  );
  await expect(page.getByTestId("tool-progress-tc-propose")).toHaveText(
    "Prepared task proposal",
  );
  await page.screenshot({ path: `${OUT}/03-agents-completed-expanded.png` });
});

test("V2 Bubble Chat replaces Send with Stop while processing and shows live collapsible process", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  const convId = "conv-e2e-1";
  const turnId = "turn-bubble-1";
  let cancelCalled = false;

  await page.route(
    `**/api/ai/conversations/${convId}/turns**`,
    async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      const method = route.request().method();

      if (
        path === `/api/ai/conversations/${convId}/turns` &&
        method === "POST"
      ) {
        return route.fulfill({
          status: 202,
          json: {
            data: {
              turnId,
              conversationId: convId,
              requestId: "req-bubble-1",
              status: "processing",
              partialResponse: "",
              lastEventSeq: 1,
              toolProgress: [
                {
                  toolCallId: "tc-bubble-1",
                  label: "Searching tasks",
                  status: "started",
                },
              ],
              deadlineAt: new Date(Date.now() + 300_000).toISOString(),
            },
          },
        });
      }

      if (
        path === `/api/ai/conversations/${convId}/turns/${turnId}/cancel` &&
        method === "POST"
      ) {
        cancelCalled = true;
        return route.fulfill({
          status: 200,
          json: {
            data: {
              turnId,
              conversationId: convId,
              requestId: "req-bubble-1",
              status: "cancelled",
              partialResponse: "",
              lastEventSeq: 2,
              toolProgress: [
                {
                  toolCallId: "tc-bubble-1",
                  label: "Searching tasks",
                  status: "unknown",
                },
              ],
              deadlineAt: new Date(Date.now() + 300_000).toISOString(),
            },
          },
        });
      }

      if (
        path === `/api/ai/conversations/${convId}/turns/${turnId}/events` &&
        method === "GET"
      ) {
        // Hold stream open so user can inspect live process and click Stop
        await new Promise((r) => setTimeout(r, 8000));
        return route.abort();
      }

      return route.fallback();
    },
  );

  await page.goto("/v2/dashboard");
  await page.evaluate(() => {
    localStorage.setItem("orbit.v2-palette", "ocean");
  });
  await page.reload();
  await expect(page.getByTestId("v2-dashboard-page")).toBeVisible();

  // Open V2 Assistant Bubble
  await page.getByTestId("v2-assistant-trigger").click();
  const panel = page.getByTestId("v2-assistant-panel");
  await expect(panel).toBeVisible();

  const input = panel.getByRole("textbox", { name: "Message" });
  await input.fill("Summarize my tasks");
  await input.press("Enter");

  // Minimal live process line appears inside the bubble (no nested card)
  await expect(panel.getByTestId("agent-process-live")).toBeVisible();
  await expect(panel.getByTestId("tool-progress-tc-bubble-1")).toBeVisible();

  // Send button inside the bubble composer is replaced with Stop (and no duplicate Stop button exists)
  const stopButtons = panel.getByRole("button", { name: /^Stop$/i });
  await expect(stopButtons).toHaveCount(1);
  await expect(stopButtons.first()).toHaveClass(/chat-send/);
  await expect(stopButtons.first()).toBeEnabled();

  await page.screenshot({ path: `${OUT}/04-bubble-live-process-and-stop.png` });

  // Clicking Stop calls /cancel
  await stopButtons.first().click();
  await expect.poll(() => cancelCalled).toBe(true);
});

test("V2 Agents preserves companion assistant text above an A2UI surface during stream and after reload", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  const convId = "conv-e2e-1";
  const turnId = "turn-a2ui-companion";
  const companionText =
    "Mình đã rà soát lịch tuần này và tổng hợp thành bảng bên dưới để bạn dễ theo dõi:";
  const composedFixture = (
    await import("../src/test/fixtures/a2ui-composition-v09.json", {
      with: { type: "json" },
    })
  ).default;
  const surface = composedFixture.readonly;
  let completed = false;

  await page.route(`**/api/ai/conversations/${convId}**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === `/api/ai/conversations/${convId}/turns` && method === "POST") {
      return route.fulfill({
        status: 202,
        json: {
          data: {
            turnId,
            conversationId: convId,
            requestId: "req-a2ui-1",
            status: "processing",
            partialResponse: "",
            lastEventSeq: 0,
            toolProgress: [],
            deadlineAt: new Date(Date.now() + 300_000).toISOString(),
          },
        },
      });
    }

    if (
      path === `/api/ai/conversations/${convId}/turns/${turnId}/events` &&
      method === "GET"
    ) {
      completed = true;
      const now = new Date().toISOString();
      const body = [
        `id: 1\nevent: assistant.delta\ndata: ${JSON.stringify({ version: 1, turnId, seq: 1, occurredAt: now, payload: { messageId: `${turnId}:bot`, text: companionText } })}\n\n`,
        `id: 2\nevent: tool.started\ndata: ${JSON.stringify({ version: 1, turnId, seq: 2, occurredAt: now, payload: { toolCallId: "tc-ui", label: "Đang hiển thị giao diện" } })}\n\n`,
        `id: 3\nevent: tool.finished\ndata: ${JSON.stringify({ version: 1, turnId, seq: 3, occurredAt: now, payload: { toolCallId: "tc-ui", status: "succeeded", summary: "Đã hiển thị giao diện" } })}\n\n`,
        `id: 4\nevent: turn.finished\ndata: ${JSON.stringify({ version: 1, turnId, seq: 4, occurredAt: now, payload: { status: "completed", result: { response: surface.text, companionText, surface } } })}\n\n`,
      ].join("");

      return route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
        body,
      });
    }

    if (path === `/api/ai/conversations/${convId}` && method === "GET") {
      return route.fulfill({
        status: 200,
        json: {
          data: {
            conversationId: convId,
            title: "E2E Workspace Planning",
            mode: "auto",
            before: null,
            pending: [],
            activeRun: null,
            context: { projectId: null, available: true },
            activities: [],
            messages: [
              {
                id: "msg-1",
                sender: "user",
                text: "What is the plan for this week?",
                timestamp: "2026-11-06T00:00:00.000Z",
              },
              ...(completed
                ? [
                    {
                      id: `${turnId}:user`,
                      sender: "user",
                      text: "Show my weekly study plan",
                      timestamp: "2026-11-21T08:00:00.000Z",
                    },
                    {
                      id: `${turnId}:bot`,
                      sender: "bot",
                      text: surface.text,
                      companionText,
                      surface,
                      toolProgress: [
                        {
                          toolCallId: "tc-ui",
                          label: "Đang hiển thị giao diện",
                          status: "succeeded",
                          summary: "Đã hiển thị giao diện",
                        },
                      ],
                      timestamp: "2026-11-21T08:00:04.000Z",
                    },
                  ]
                : []),
            ],
          },
        },
      });
    }

    return route.fallback();
  });

  await page.goto(`/v2/agents?conversation=${convId}`);
  await expect(page.getByTestId("v2-agents-page")).toBeVisible();

  const input = page.getByRole("textbox", { name: "Message" });
  await input.fill("Show my weekly study plan");
  await input.press("Enter");

  // Both the agent's companion text AND the A2UI Weekly Study Plan surface stay visible
  await expect(page.getByText(companionText)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Weekly Study Plan" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await page.screenshot({ path: `${OUT}/05-a2ui-with-companion-text.png` });
});
