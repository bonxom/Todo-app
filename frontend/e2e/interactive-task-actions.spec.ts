import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dashboardFixture } from "./dashboard.fixture";

const interactiveFixture = JSON.parse(
  readFileSync(
    new URL("../src/test/fixtures/a2ui-interactive-v09.json", import.meta.url),
    "utf8",
  ),
);

interface MockOptions {
  dropFirstAction?: boolean;
  delayFirstActionMs?: number;
  flagDisabled?: boolean;
  malformedCatalog?: boolean;
  secondConversationId?: string;
}

async function setupInteractiveActionMocks(
  page: Page,
  options: MockOptions = {},
) {
  await dashboardFixture(page, false);

  const conversationId = "11111111-1111-4111-8111-111111111111";
  const secondConversationId =
    options.secondConversationId ?? "99999999-9999-4999-8999-999999999999";
  const turnId = "turn-interactive-1";
  const secondTurnId = "turn-interactive-2";
  const taskId = interactiveFixture.taskId as string;
  const secondTaskId = "fedcba9876543210fedcba98";
  const surface = structuredClone(interactiveFixture.envelope);
  const bindings = structuredClone(interactiveFixture.stored.actionBindings);

  if (options.malformedCatalog) {
    surface.a2ui.messages[1].updateComponents.components = [
      {
        id: "root",
        component: "Card",
        title: "Unknown Test",
        children: ["unknownNode"],
      },
      {
        id: "unknownNode",
        component: "AlienWidget",
      },
    ];
  }

  let taskStatus: "in-progress" | "completed" = "in-progress";
  let completedAt: string | null = null;
  let outcomes: Array<Record<string, unknown>> = [];
  const submittedRequests: Array<{ requestId: string; actionId: string }> = [];
  let actionCount = 0;

  const taskRecord = () => ({
    _id: taskId,
    title: "Chuẩn bị slide demo",
    description: "Hoàn tất slide thuyết trình.",
    status: taskStatus,
    priority: "High",
    categoryId: "work",
    projectId: null,
    dueDate: new Date().toISOString(),
    completedAt,
    createdAt: "2026-11-26T00:00:00.000Z",
    updatedAt: "2026-11-27T00:00:00.000Z",
  });

  const secondTaskRecord = () => ({
    _id: secondTaskId,
    title: "Review notes in conversation B",
    description: "",
    status: "in-progress",
    priority: "Medium",
    categoryId: "work",
    projectId: null,
    dueDate: new Date().toISOString(),
    completedAt: null,
    createdAt: "2026-11-26T00:00:00.000Z",
    updatedAt: "2026-11-27T00:00:00.000Z",
  });

  await page.route("**/api/tasks**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    if (pathname === `/api/tasks/${taskId}`) {
      return route.fulfill({ json: taskRecord() });
    }
    if (pathname === `/api/tasks/${secondTaskId}`) {
      return route.fulfill({ json: secondTaskRecord() });
    }
    if (pathname === "/api/tasks/stats") {
      return route.fulfill({
        json: {
          totalTasks: 2,
          completedTasks: taskStatus === "completed" ? 1 : 0,
          inProgressTasks: taskStatus === "completed" ? 1 : 2,
          pendingTasks: 0,
          givenUpTasks: 0,
          dailyStats: [],
        },
      });
    }
    if (pathname === "/api/tasks") {
      const list = [taskRecord(), secondTaskRecord()];
      return route.fulfill({
        json: {
          data: list,
          pageInfo: {
            pageNo: 1,
            pageSize: 10,
            totalCount: list.length,
            totalPage: 1,
          },
        },
      });
    }
    return route.continue();
  });

  await page.route("**/api/stats**", async (route) => {
    return route.fulfill({
      json: {
        totalTasks: 2,
        completedTasks: taskStatus === "completed" ? 1 : 0,
        inProgressTasks: taskStatus === "completed" ? 1 : 2,
        pendingTasks: 0,
        givenUpTasks: 0,
        dailyStats: [],
      },
    });
  });

  await page.route("**/api/ai/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/capabilities")) {
      return route.fulfill({
        json: {
          taskProposals: true,
          interactiveUi: !options.flagDisabled,
          uiActions: options.flagDisabled ? [] : ["task.complete"],
        },
      });
    }

    if (pathname.endsWith("/conversations")) {
      return route.fulfill({
        json: {
          data: [
            {
              id: conversationId,
              title: "Slide demo actions",
              updatedAt: new Date().toISOString(),
              projectId: null,
            },
            {
              id: secondConversationId,
              title: "Secondary conversation",
              updatedAt: new Date(Date.now() - 60_000).toISOString(),
              projectId: null,
            },
          ],
          pageInfo: { nextCursor: null, hasMore: false },
        },
      });
    }

    if (pathname.endsWith("/actions")) {
      const body = route.request().postDataJSON() as {
        requestId: string;
        actionId: string;
      };
      submittedRequests.push(body);
      actionCount += 1;

      if (options.delayFirstActionMs && actionCount === 1) {
        await new Promise((r) => setTimeout(r, options.delayFirstActionMs));
      }

      if (options.dropFirstAction && actionCount === 1) {
        taskStatus = "completed";
        completedAt = "2026-11-27T01:05:00.000Z";
        return route.abort("failed");
      }

      taskStatus = "completed";
      completedAt = "2026-11-27T01:05:00.000Z";
      const result = {
        requestId: body.requestId,
        actionId: body.actionId,
        outcome: "succeeded" as const,
        task: {
          id: taskId,
          title: "Chuẩn bị slide demo",
          description: "Hoàn tất slide thuyết trình.",
          status: "completed" as const,
          priority: "High" as const,
          categoryId: "507f1f77bcf86cd799439011",
          projectId: null,
          startDate: null,
          dueDate: taskRecord().dueDate,
          completedAt,
          createdAt: "2026-11-26T00:00:00.000Z",
          updatedAt: completedAt,
        },
      };
      outcomes = [
        {
          ...result,
          turnId,
          surfaceId: interactiveFixture.surfaceId,
          committedAt: completedAt,
        },
      ];
      return route.fulfill({ json: result });
    }

    if (pathname.endsWith(`/conversations/${secondConversationId}`)) {
      const secondSurfaceId = "22222222-2222-4222-8222-222222222222";
      const secondSurface = structuredClone(interactiveFixture.envelope);
      secondSurface.a2ui.surfaceId = secondSurfaceId;
      for (const msg of secondSurface.a2ui.messages) {
        if ("createSurface" in msg)
          msg.createSurface.surfaceId = secondSurfaceId;
        if ("updateComponents" in msg)
          msg.updateComponents.surfaceId = secondSurfaceId;
        if ("updateDataModel" in msg)
          msg.updateDataModel.surfaceId = secondSurfaceId;
      }
      const secondBinding = {
        ...bindings[0],
        id: "44444444-4444-4444-8444-444444444444",
        taskId: secondTaskId,
      };
      return route.fulfill({
        json: {
          data: {
            capabilities: {
              taskProposals: true,
              interactiveUi: true,
              uiActions: ["task.complete"],
            },
            conversationId: secondConversationId,
            title: "Secondary conversation",
            mode: "auto",
            context: null,
            activeRun: null,
            activities: [],
            before: null,
            pending: [],
            messages: [
              {
                id: `${secondTurnId}:bot`,
                turnId: secondTurnId,
                sender: "bot",
                text: "Secondary interactive task card.",
                companionText: "Secondary interactive task card.",
                timestamp: new Date().toISOString(),
                surface: secondSurface,
                actionBindings: [secondBinding],
              },
            ],
          },
        },
      });
    }

    return route.fulfill({
      json: {
        data: {
          capabilities: {
            taskProposals: true,
            interactiveUi: !options.flagDisabled,
            uiActions: options.flagDisabled ? [] : ["task.complete"],
          },
          conversationId,
          title: "Slide demo actions",
          mode: "auto",
          context: null,
          activeRun: null,
          activities: [],
          before: null,
          pending: [],
          messages: [
            {
              id: `${turnId}:bot`,
              turnId,
              sender: "bot",
              text: surface.text,
              companionText: "Nhấn Hoàn thành khi bạn đã xong slide.",
              timestamp: new Date().toISOString(),
              ...(options.flagDisabled
                ? {}
                : { surface, actionBindings: bindings }),
              ...(outcomes.length ? { uiActionOutcomes: outcomes } : {}),
            },
          ],
        },
      },
    });
  });

  return { submittedRequests };
}

test("completes task via keyboard on interactive Button, refreshes dashboard and preserves state across reload", async ({
  page,
}) => {
  const { submittedRequests } = await setupInteractiveActionMocks(page);
  await page.goto("/dashboard");

  await expect(
    page.getByRole("button", { name: "Chuẩn bị slide demo", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open assistant" }).click();

  const btn = page.getByRole("button", { name: "Hoàn thành", exact: true });
  await expect(btn).toBeEnabled();
  await btn.focus();
  await btn.press("Enter");

  await expect(btn).toBeDisabled();
  await expect(page.getByRole("status")).toContainText(/Completed/i);
  expect(submittedRequests).toHaveLength(1);
  expect(Object.keys(submittedRequests[0]).sort()).toEqual([
    "actionId",
    "requestId",
  ]);
  expect(submittedRequests[0].actionId).toBe(interactiveFixture.actionId);

  await page.reload();
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(
    page.getByRole("button", { name: "Hoàn thành", exact: true }),
  ).toBeDisabled();
});

test("handles dropped response with uncertain retry using identical requestId and actionId", async ({
  page,
}) => {
  const { submittedRequests } = await setupInteractiveActionMocks(page, {
    dropFirstAction: true,
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();

  const btn = page.getByRole("button", { name: "Hoàn thành", exact: true });
  await expect(btn).toBeEnabled();
  await btn.click();

  const retryBtn = page.getByRole("button", { name: /Retry/i });
  await expect(retryBtn).toBeVisible();
  await expect(btn).toBeDisabled();

  await retryBtn.click();
  await expect(page.getByRole("status")).toContainText(/Completed/i);
  await expect(retryBtn).toHaveCount(0);
  expect(submittedRequests).toHaveLength(2);
  expect(submittedRequests[1]).toEqual(submittedRequests[0]);
});

test("falls back safely to text for unsupported interactive components and flag-off mode", async ({
  page,
}) => {
  await setupInteractiveActionMocks(page, { malformedCatalog: true });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();

  await expect(page.getByText("Chuẩn bị slide demo").last()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Hoàn thành", exact: true }),
  ).toHaveCount(0);

  await setupInteractiveActionMocks(page, { flagDisabled: true });
  await page.reload();
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(
    page.getByRole("button", { name: "Hoàn thành", exact: true }),
  ).toHaveCount(0);
});

test("renders comfortably on 390px narrow mobile viewport without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupInteractiveActionMocks(page);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();

  const btn = page.getByRole("button", { name: "Hoàn thành", exact: true });
  await expect(btn).toBeEnabled();
  const box = await btn.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("isolates delayed in-flight action when switching conversations", async ({
  page,
}) => {
  const { submittedRequests } = await setupInteractiveActionMocks(page, {
    delayFirstActionMs: 350,
  });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open assistant" }).click();

  const btnA = page.getByRole("button", { name: "Hoàn thành", exact: true });
  await expect(btnA).toBeEnabled();
  await btnA.click();

  await page.getByRole("button", { name: "Chat history" }).click();
  await page.getByRole("button", { name: /Secondary conversation/i }).click();

  await expect(
    page.getByText("Secondary interactive task card."),
  ).toBeVisible();
  const btnB = page.getByRole("button", { name: "Hoàn thành", exact: true });
  await expect(btnB).toBeEnabled();
  expect(submittedRequests).toHaveLength(1);
});
