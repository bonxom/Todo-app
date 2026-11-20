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
        title: "Create project structure",
        resourceType: "task",
        resourceId: "1",
        occurredAt: "2026-11-06T00:00:00.000Z",
      },
    ],
    messages: options.initialMessages || [
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
    ],
  };

  const conversationsList = [
    {
      id: activeConvId,
      title: "E2E Workspace Planning",
      createdAt: "2026-11-06T00:00:00.000Z",
      updatedAt: "2026-11-06T00:00:00.000Z",
      projectId: options.contextProjectId ?? null,
    },
    {
      id: "conv-other-2",
      title: "Personal conversation",
      createdAt: "2026-11-05T00:00:00.000Z",
      updatedAt: "2026-11-05T00:00:00.000Z",
      projectId: null,
    },
  ];

  const snapshots = new Map<string, ConversationSnapshot>([
    [activeConvId, defaultSnapshot],
    [
      "conv-other-2",
      {
        ...defaultSnapshot,
        conversationId: "conv-other-2",
        title: "Personal conversation",
        messages: [],
        activities: [],
        context: { projectId: null, available: true },
      },
    ],
  ]);

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
      const conversationId = path.split("/")[4];
      const snapshot = snapshots.get(conversationId);
      if (snapshot)
        snapshot.context = { projectId: payload.projectId, available: true };
      const summary = conversationsList.find(
        (item) => item.id === conversationId,
      );
      if (summary) summary.projectId = payload.projectId;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            conversationId,
            contextProjectId: payload.projectId,
          },
        }),
      });
    }

    if (path.includes("/turns")) {
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Turns not mocked in fixture default",
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
          data: snapshots.get(convId === "latest" ? activeConvId : convId),
        }),
      });
    }

    if (path === "/api/ai/conversations" && method === "POST") {
      const { conversationId: newId, projectId } = route
        .request()
        .postDataJSON();
      if (!snapshots.has(newId)) {
        snapshots.set(newId, {
          ...defaultSnapshot,
          conversationId: newId,
          title: "New conversation",
          messages: [],
          activities: [],
          context: { projectId: projectId ?? null, available: true },
        });
      }
      return route.fulfill({ status: 201, json: { conversationId: newId } });
    }

    if (path === "/api/ai/chat-mcp" && method === "POST") {
      const payload = route.request().postDataJSON();
      // Mirror persisted history so the client's post-send refresh keeps the reply.
      const timestamp = new Date().toISOString();
      const replyText = "Phản hồi mẫu từ Orbit Agent cho: " + payload.userInput;
      const snapshot = snapshots.get(payload.conversationId) ?? defaultSnapshot;
      if (
        !conversationsList.some((item) => item.id === snapshot.conversationId)
      ) {
        snapshot.title = payload.userInput;
        conversationsList.unshift({
          id: snapshot.conversationId,
          title: snapshot.title,
          createdAt: timestamp,
          updatedAt: timestamp,
          projectId: snapshot.context?.projectId ?? null,
        });
      }
      snapshot.messages.push(
        {
          id: `user-${Date.now()}`,
          sender: "user",
          text: payload.userInput,
          timestamp,
        },
        { id: `bot-${Date.now()}`, sender: "bot", text: replyText, timestamp },
      );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          status: "completed",
          conversationId: payload.conversationId || activeConvId,
          requestId: payload.requestId || "req-reply",
          data: replyText,
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
