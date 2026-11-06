import type { Page } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";
import type {
  AgentActivity,
  ConversationSnapshot,
  ConversationMessage,
} from "../src/shared/types/domain";

export interface AgentWorkspaceFixtureOptions {
  conversationId?: string;
  activities?: AgentActivity[];
  initialMessages?: ConversationMessage[];
  contextProjectId?: string | null;
}

export async function agentWorkspaceFixture(
  page: Page,
  options: AgentWorkspaceFixtureOptions = {},
) {
  await dashboardFixture(page);

  const activeConvId = options.conversationId || "conv-e2e-1";

  const defaultSnapshot: ConversationSnapshot = {
    conversationId: activeConvId,
    title: "E2E Workspace Planning",
    mode: "auto",
    before: null,
    pending: [],
    context: {
      projectId: options.contextProjectId ?? null,
      available: true,
    },
    activities: options.activities || [
      {
        id: "act-1",
        requestId: "req-1",
        toolCallId: "call-1",
        kind: "task_created",
        status: "succeeded",
        title: "Tạo cấu trúc dự án",
        resourceType: "task",
        resourceId: "1",
        occurredAt: "2026-11-06T00:00:00.000Z",
      },
    ],
    messages: options.initialMessages || [
      {
        id: "msg-1",
        sender: "user",
        text: "Kế hoạch tuần này là gì?",
        timestamp: "2026-11-06T00:00:00.000Z",
      },
      {
        id: "msg-2",
        sender: "bot",
        text: "Tôi đã lên kế hoạch và tạo nhiệm vụ cần thiết.",
        timestamp: "2026-11-06T00:00:05.000Z",
      },
    ],
  };

  const conversationsList = [
    {
      id: activeConvId,
      title: "E2E Workspace Planning",
      createdAt: "2026-11-06T00:00:00.000Z",
      updatedAt: "2026-11-06T00:00:00.000Z",
    },
    {
      id: "conv-other-2",
      title: "Hội thoại cá nhân",
      createdAt: "2026-11-05T00:00:00.000Z",
      updatedAt: "2026-11-05T00:00:00.000Z",
    },
  ];

  let currentContextProjectId = options.contextProjectId ?? null;

  await page.route("**/api/ai/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === "/api/ai/conversations/capabilities") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          taskProposals: true,
        }),
      });
    }

    if (path === "/api/ai/conversations" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: conversationsList,
        }),
      });
    }

    if (
      path.match(/\/api\/ai\/conversations\/[^/]+\/context$/) &&
      method === "PATCH"
    ) {
      const payload = route.request().postDataJSON();
      currentContextProjectId = payload.projectId;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            conversationId: activeConvId,
            contextProjectId: currentContextProjectId,
          },
        }),
      });
    }

    if (path.startsWith("/api/ai/conversations/")) {
      const convId = path.split("/")[4];
      if (convId === "unowned-or-invalid") {
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "Conversation not found",
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            ...defaultSnapshot,
            conversationId:
              convId === "latest" ? activeConvId : convId || activeConvId,
            context: {
              projectId: currentContextProjectId,
              available: true,
            },
          },
        }),
      });
    }

    if (path === "/api/ai/conversations" && method === "POST") {
      const newId = route.request().postDataJSON().conversationId;
      return route.fulfill({ status: 201, json: { conversationId: newId } });
    }

    if (path === "/api/ai/chat-mcp" && method === "POST") {
      const payload = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          status: "completed",
          conversationId: payload.conversationId || activeConvId,
          requestId: payload.requestId || "req-reply",
          data: "Phản hồi mẫu từ Orbit Agent cho: " + payload.userInput,
          activities: [
            {
              id: "act-new-" + Date.now(),
              requestId: payload.requestId || "req-reply",
              toolCallId: "call-2",
              kind: "task_created",
              status: "succeeded",
              title: "Nhiệm vụ mới tạo từ câu lệnh",
              resourceType: "task",
              resourceId: "2",
              occurredAt: new Date().toISOString(),
            },
          ],
        }),
      });
    }

    return route.continue();
  });
}
