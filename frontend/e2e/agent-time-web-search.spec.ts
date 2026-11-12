import { expect, test } from "@playwright/test";
import { agentWorkspaceFixture } from "./agent-workspace.fixture";

test.describe("Agent Time & Web Search E2E", () => {
  test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

  test("sends browser timezone in chat request and renders clickable source citation link", async ({
    page,
  }) => {
    let capturedPayload: Record<string, unknown> | undefined;

    const messages = [
      {
        id: "msg-1",
        sender: "user" as const,
        text: "Xin chào",
        timestamp: "2026-11-06T00:00:00.000Z",
      },
    ];

    await agentWorkspaceFixture(page, {
      conversationId: "conv-e2e-1",
      initialMessages: messages,
    });

    await page.route("**/api/ai/conversations/**", async (route) => {
      const url = new URL(route.request().url());
      if (
        url.pathname.match(/\/api\/ai\/conversations\/[^/]+$/) &&
        route.request().method() === "GET"
      ) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              conversationId: "conv-e2e-1",
              title: "E2E Workspace Planning",
              mode: "auto",
              before: null,
              pending: [],
              context: { projectId: null, available: true },
              activities: [],
              messages,
            },
          }),
        });
      }
      return route.continue();
    });

    // Override chat-mcp handler to capture payload and return citation
    await page.route("**/api/ai/chat-mcp", async (route) => {
      capturedPayload = route.request().postDataJSON();
      messages.push({
        id: "msg-reply",
        sender: "bot",
        text: "Kết quả tra cứu: [Tài liệu React](https://react.dev/learn)",
        timestamp: new Date().toISOString(),
      });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          status: "completed",
          conversationId: capturedPayload?.conversationId || "conv-e2e-1",
          requestId: capturedPayload?.requestId || "req-test",
          data: "Kết quả tra cứu: [Tài liệu React](https://react.dev/learn)",
          activities: [],
        }),
      });
    });
    await page.goto("/agent");
    const input = page.getByRole("textbox", { name: "Message" });
    await expect(input).toBeVisible();

    await input.fill("Tìm tài liệu học React");
    await page.getByRole("button", { name: "Send message" }).click();
    // Verify browser timezone sent in request payload
    await expect.poll(() => capturedPayload).toBeDefined();
    expect(["Asia/Ho_Chi_Minh", "Asia/Saigon"]).toContain(
      capturedPayload?.timeZone,
    );
    expect(capturedPayload).not.toHaveProperty("now");

    // Verify rendered link with target blank and safe rel
    const citationLink = page.getByRole("link", { name: "Tài liệu React" });
    await expect(citationLink).toBeVisible();
    await expect(citationLink).toHaveAttribute(
      "href",
      "https://react.dev/learn",
    );
    await expect(citationLink).toHaveAttribute("target", "_blank");
    await expect(citationLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("renders source citation links from reloaded conversation history", async ({
    page,
  }) => {
    await agentWorkspaceFixture(page, {
      conversationId: "conv-history-links",
      initialMessages: [
        {
          id: "msg-1",
          sender: "user",
          text: "Tìm tài liệu Brave Search",
          timestamp: "2026-11-12T00:00:00.000Z",
        },
        {
          id: "msg-2",
          sender: "bot",
          text: "Nguồn chính thức: [Brave Search API](https://api.search.brave.com/docs)",
          timestamp: "2026-11-12T00:00:05.000Z",
        },
      ],
    });

    await page.goto("/agent?conversation=conv-history-links");

    const historyLink = page.getByRole("link", { name: "Brave Search API" });
    await expect(historyLink).toBeVisible();
    await expect(historyLink).toHaveAttribute(
      "href",
      "https://api.search.brave.com/docs",
    );
  });

  test("remains interactive when search is unavailable", async ({ page }) => {
    await agentWorkspaceFixture(page);

    await page.route("**/api/ai/chat-mcp", async (route) => {
      const payload = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          status: "completed",
          conversationId: payload?.conversationId || "conv-e2e-1",
          requestId: payload?.requestId || "req-test-fail",
          data: "Chưa thể tra cứu thông tin web lúc này do dịch vụ tìm kiếm tạm thời gián đoạn.",
          activities: [],
        }),
      });
    });

    await page.goto("/agent");
    const input = page.getByRole("textbox", { name: "Message" });
    await input.fill("Tìm kiếm tin tức");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(
      page.getByText("Chưa thể tra cứu thông tin web"),
    ).toBeVisible();

    // Verify input is enabled and user can send a follow-up
    await expect(input).toBeEnabled();
  });
});
