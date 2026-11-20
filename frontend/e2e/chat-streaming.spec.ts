import { test, expect } from "@playwright/test";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

test.describe("Chat streaming and live controls", () => {
  test.beforeEach(async ({ page }) => {
    await agentWorkspaceFixture(page);
    await page.addInitScript(() =>
      localStorage.setItem("orbit-theme", "light"),
    );
  });

  test("displays live text delta, tool progress, and stop button during streaming", async ({
    page,
  }) => {
    // Mock the streaming start endpoint: POST /api/ai/conversations/*/turns
    await page.route(
      /\/api\/ai\/conversations\/[^/]+\/turns$/,
      async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 202,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                turnId: "turn-stream-1",
                conversationId: "conv-e2e-1",
                requestId: "req-stream-1",
                status: "processing",
                partialResponse: "Bắt đầu xử lý: ",
                lastEventSeq: 1,
                toolProgress: [],
                deadlineAt: new Date(Date.now() + 300_000).toISOString(),
              },
            }),
          });
          return;
        }
        await route.continue();
      },
    );

    // Mock the events SSE endpoint
    await page.route(
      /\/api\/ai\/conversations\/[^/]+\/turns\/turn-stream-1\/events/,
      async (route) => {
        const events = [
          'event: turn.started\ndata: {"version":1,"turnId":"turn-stream-1","seq":1,"occurredAt":"2026-11-18T00:00:00Z","payload":{"deadlineAt":"2026-11-18T00:05:00Z"}}\n\n',
          'event: assistant.delta\ndata: {"version":1,"turnId":"turn-stream-1","seq":2,"occurredAt":"2026-11-18T00:00:01Z","payload":{"messageId":"turn-stream-1:bot","text":"Bắt đầu xử lý: Tôi đang tạo task mới..."}}\n\n',
          'event: tool.started\ndata: {"version":1,"turnId":"turn-stream-1","seq":3,"occurredAt":"2026-11-18T00:00:02Z","payload":{"toolCallId":"call-1","label":"Tạo công việc"}}\n\n',
          'event: tool.finished\ndata: {"version":1,"turnId":"turn-stream-1","seq":4,"occurredAt":"2026-11-18T00:00:03Z","payload":{"toolCallId":"call-1","status":"succeeded","summary":"Đã tạo: Soạn báo cáo"}}\n\n',
        ].join("");

        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          headers: {
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          body: events,
        });
      },
    );

    await page.goto("/agent?conversation=conv-e2e-1");

    const composer = page.getByRole("textbox", { name: "Message" });
    await expect(composer).toBeVisible();

    await composer.fill("Lên kế hoạch hôm nay");
    await page.keyboard.press("Enter");

    // Live tool progress should appear
    await expect(page.getByText("Tạo công việc")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Đã tạo: Soạn báo cáo")).toBeVisible();

    // Partial response should appear in chat
    await expect(page.getByText("Tôi đang tạo task mới...")).toBeVisible();
  });

  test("clicking Stop button transitions to Stopping state and triggers cancellation", async ({
    page,
  }) => {
    let cancelCalled = false;

    await page.route(
      /\/api\/ai\/conversations\/[^/]+\/turns$/,
      async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 202,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                turnId: "turn-cancel-1",
                conversationId: "conv-e2e-1",
                requestId: "req-cancel-1",
                status: "processing",
                partialResponse: "Đang phân tích...",
                lastEventSeq: 1,
                toolProgress: [],
                deadlineAt: new Date(Date.now() + 300_000).toISOString(),
              },
            }),
          });
          return;
        }
        await route.continue();
      },
    );

    await page.route(
      /\/api\/ai\/conversations\/[^/]+\/turns\/turn-cancel-1\/events/,
      async (route) => {
        const events =
          'event: turn.started\ndata: {"version":1,"turnId":"turn-cancel-1","seq":1,"occurredAt":"2026-11-18T00:00:00Z","payload":{"deadlineAt":"2026-11-18T00:05:00Z"}}\n\n';
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: events,
        });
      },
    );

    await page.route(
      /\/api\/ai\/conversations\/[^/]+\/turns\/turn-cancel-1\/cancel$/,
      async (route) => {
        cancelCalled = true;
        await route.fulfill({
          status: 202,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              turnId: "turn-cancel-1",
              conversationId: "conv-e2e-1",
              requestId: "req-cancel-1",
              status: "stopping",
              partialResponse: "Đang phân tích...",
              lastEventSeq: 1,
              toolProgress: [],
              deadlineAt: new Date(Date.now() + 300_000).toISOString(),
            },
          }),
        });
      },
    );

    await page.goto("/agent?conversation=conv-e2e-1");

    const composer = page.getByRole("textbox", { name: "Message" });
    await composer.fill("Chạy tác vụ dài");
    await page.keyboard.press("Enter");

    const stopBtn = page.getByRole("button", { name: /dừng|stop/i });
    await expect(stopBtn).toBeVisible({ timeout: 5000 });

    await stopBtn.click();
    expect(cancelCalled).toBe(true);

    // Transitions to Stopping
    await expect(page.getByText(/đang dừng|stopping/i)).toBeVisible();
  });

  test("handles 429 concurrency limit error, displays explanation, and preserves draft", async ({
    page,
  }) => {
    await page.route(
      /\/api\/ai\/conversations\/[^/]+\/turns$/,
      async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 429,
            contentType: "application/json",
            body: JSON.stringify({
              message:
                "Bạn đang có 3 lượt xử lý cùng lúc. Vui lòng chờ một lượt kết thúc trước khi gửi tiếp.",
              code: "CHAT_CONCURRENCY_LIMIT",
            }),
          });
          return;
        }
        await route.continue();
      },
    );

    await page.goto("/agent?conversation=conv-e2e-1");

    const composer = page.getByRole("textbox", { name: "Message" });
    const draftContent = "Yêu cầu thứ 4 vượt giới hạn";
    await composer.fill(draftContent);
    await page.keyboard.press("Enter");

    // Concurrency limit error message should appear
    await expect(
      page
        .locator(".chat-error")
        .getByText(/3 lượt xử lý cùng lúc|concurrency limit/i),
    ).toBeVisible({ timeout: 5000 });

    // Draft text must be preserved in textarea
    await expect(composer).toHaveValue(draftContent);
  });
});

test("Agent V2 replaces Send with a single Stop in the composer until cancellation finishes", async ({
  page,
}) => {
  await agentWorkspaceFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const snapshot = {
    turnId: "turn-composer-stop",
    conversationId: "conv-e2e-1",
    requestId: "req-composer-stop",
    status: "processing",
    partialResponse: "Working on the plan",
    lastEventSeq: 1,
    toolProgress: [],
    deadlineAt: new Date(Date.now() + 300_000).toISOString(),
  };
  await page.route("**/api/ai/conversations/conv-e2e-1/turns", (route) =>
    route.fulfill({ status: 202, json: { data: snapshot } }),
  );
  await page.route("**/turn-composer-stop/events?**", (route) =>
    route.fulfill({ contentType: "text/event-stream", body: "" }),
  );
  let complete!: () => void;
  const cancelPending = new Promise<void>((resolve) => {
    complete = resolve;
  });
  await page.route("**/turn-composer-stop/cancel", async (route) => {
    await cancelPending;
    await route.fulfill({
      json: { data: { ...snapshot, status: "cancelled", lastEventSeq: 2 } },
    });
  });

  await page.goto("/v2/agents?conversation=conv-e2e-1");
  const composer = page.locator(".agent-workspace-composer");
  const send = composer.getByRole("button", { name: "Send message" });
  await expect(send).toBeInViewport();
  await composer.getByRole("textbox", { name: "Message" }).fill("Make a plan");
  await send.click();
  const stop = composer.getByRole("button", { name: "Stop", exact: true });
  await expect(stop).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Stop", exact: true }),
  ).toHaveCount(1);
  await expect(send).toHaveCount(0);
  await page.mouse.move(389, 1);
  await page.screenshot({
    path: "/tmp/orbit-chat-review/v2-stop-mobile.png",
    animations: "disabled",
  });
  const cancelled = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().endsWith("/turn-composer-stop/cancel"),
  );
  await stop.click();
  await cancelled;
  await expect(
    composer.getByRole("button", { name: "Stopping..." }),
  ).toBeDisabled();
  complete();
  await expect(send).toBeInViewport();
  await expect(stop).toHaveCount(0);
});
