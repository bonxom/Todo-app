import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UI_ACTION_ERROR } from "../../error/definitions/A2UI/uiActionErrors.js";
import { chatTurnRepository } from "../../repositories/chatTurnRepository.js";
import { conversationRepository } from "../../repositories/conversationRepository.js";
import { taskCommandRepository } from "../../repositories/taskCommandRepository.js";
import type { IUserDocument } from "../../types/IUser.js";
import { uiActionService } from "../A2UI/uiActionService.js";
import { taskCommandService } from "../taskCommandService.js";

const fixturePath = resolve(
  process.cwd(),
  "../frontend/src/test/fixtures/a2ui-interactive-v09.json",
);
const interactiveFixture = JSON.parse(readFileSync(fixturePath, "utf-8"));

describe("uiActionService", () => {
  const userId = new mongoose.Types.ObjectId();
  const user = { _id: userId, role: "USER" } as IUserDocument;
  const conversationId = randomUUID();
  const turnId = "turn-1";
  const surfaceId = interactiveFixture.surfaceId as string;
  const actionId = interactiveFixture.actionId as string;
  const location = { conversationId, turnId, surfaceId };
  const input = { requestId: randomUUID(), actionId };

  const makeCompletedTurn = (overrides: Record<string, unknown> = {}) => ({
    _id: turnId,
    conversationId,
    userId,
    status: "completed",
    uiSurface: structuredClone(interactiveFixture.stored),
    ...overrides,
  });

  beforeEach(() => {
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "true");
    vi.stubEnv("A2UI_INTERACTIVE_ENABLED", "true");
    vi.spyOn(conversationRepository, "get").mockResolvedValue({
      _id: conversationId,
      userId,
    } as never);
    vi.spyOn(chatTurnRepository, "active").mockResolvedValue(
      makeCompletedTurn() as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects non-USER accounts with 403 before calling taskCommandService", async () => {
    const updateSpy = vi.spyOn(taskCommandService, "update");

    await expect(
      uiActionService.execute(location, input, {
        ...user,
        role: "ADMIN",
      } as IUserDocument),
    ).rejects.toMatchObject({
      code: UI_ACTION_ERROR.USER_ACCOUNT_ONLY.code,
      statusCode: 403,
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("rejects with 409 when interactive UI or composition flag is disabled", async () => {
    const updateSpy = vi.spyOn(taskCommandService, "update");

    vi.stubEnv("A2UI_INTERACTIVE_ENABLED", "false");
    await expect(
      uiActionService.execute(location, input, user),
    ).rejects.toMatchObject({
      code: UI_ACTION_ERROR.DISABLED.code,
      statusCode: 409,
    });

    vi.stubEnv("A2UI_INTERACTIVE_ENABLED", "true");
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "false");
    await expect(
      uiActionService.execute(location, input, user),
    ).rejects.toMatchObject({
      code: UI_ACTION_ERROR.DISABLED.code,
      statusCode: 409,
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("returns uniform 404 for missing or foreign conversation, turn, surface, catalog, or action", async () => {
    const updateSpy = vi.spyOn(taskCommandService, "update");

    // Missing/foreign conversation
    vi.mocked(conversationRepository.get).mockResolvedValueOnce(null as never);
    await expect(
      uiActionService.execute(location, input, user),
    ).rejects.toMatchObject({
      code: UI_ACTION_ERROR.NOT_FOUND.code,
      statusCode: 404,
    });

    // Missing/foreign turn
    vi.mocked(chatTurnRepository.active).mockResolvedValueOnce(null);
    await expect(
      uiActionService.execute(location, input, user),
    ).rejects.toMatchObject({
      code: UI_ACTION_ERROR.NOT_FOUND.code,
      statusCode: 404,
    });

    // Wrong surfaceId
    await expect(
      uiActionService.execute(
        { ...location, surfaceId: randomUUID() },
        input,
        user,
      ),
    ).rejects.toMatchObject({
      code: UI_ACTION_ERROR.NOT_FOUND.code,
      statusCode: 404,
    });

    // Wrong catalog (e.g., legacy composition surface)
    vi.mocked(chatTurnRepository.active).mockResolvedValueOnce(
      makeCompletedTurn({
        uiSurface: {
          catalogId: "urn:orbit:a2ui:composition:v1",
          surfaceId,
          spec: {
            fallbackText: "Readonly",
            components: [{ id: "root", component: "Card", children: [] }],
            displayData: {},
          },
        },
      }) as never,
    );
    await expect(
      uiActionService.execute(location, input, user),
    ).rejects.toMatchObject({
      code: UI_ACTION_ERROR.NOT_FOUND.code,
      statusCode: 404,
    });

    // Unknown actionId
    await expect(
      uiActionService.execute(
        location,
        { ...input, actionId: randomUUID() },
        user,
      ),
    ).rejects.toMatchObject({
      code: UI_ACTION_ERROR.NOT_FOUND.code,
      statusCode: 404,
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("rejects non-completed source turns with 409 without invoking taskCommandService", async () => {
    const updateSpy = vi.spyOn(taskCommandService, "update");

    for (const status of [
      "processing",
      "stopping",
      "awaiting_user",
      "failed",
      "cancelled",
      "timed_out",
      "interrupted",
    ]) {
      vi.mocked(chatTurnRepository.active).mockResolvedValueOnce(
        makeCompletedTurn({ status }) as never,
      );
      await expect(
        uiActionService.execute(location, input, user),
      ).rejects.toMatchObject({
        code: UI_ACTION_ERROR.TURN_NOT_COMPLETED.code,
        statusCode: 409,
      });
    }

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("dispatches task.complete using stored binding taskId and ui_ prefixed idempotency key", async () => {
    const taskDto = {
      id: interactiveFixture.taskId,
      title: "Chuẩn bị slide demo",
      description: null,
      status: "completed" as const,
      priority: "Medium" as const,
      categoryId: String(new mongoose.Types.ObjectId()),
      projectId: null,
      startDate: null,
      dueDate: null,
      completedAt: "2026-11-27T01:00:00.000Z",
      createdAt: "2026-11-26T01:00:00.000Z",
      updatedAt: "2026-11-27T01:00:00.000Z",
    };

    const updateSpy = vi
      .spyOn(taskCommandService, "update")
      .mockResolvedValue({ task: taskDto });

    const result = await uiActionService.execute(location, input, user);

    expect(updateSpy).toHaveBeenCalledWith(
      {
        taskId: interactiveFixture.taskId,
        changes: { status: "completed" },
        idempotencyKey: `ui_${input.requestId}`,
      },
      {
        user,
        requestId: input.requestId,
        origin: {
          channel: "a2ui",
          conversationId,
          turnId,
          surfaceId,
          actionId,
        },
      },
    );
    expect(result).toEqual({
      requestId: input.requestId,
      actionId,
      outcome: "succeeded",
      task: taskDto,
    });
  });

  it("projects up to 3 recent outcomes scoped by user and conversation", async () => {
    const taskDto = {
      id: interactiveFixture.taskId,
      title: "Task",
      description: null,
      status: "completed" as const,
      priority: "Low" as const,
      categoryId: null,
      projectId: null,
      startDate: null,
      dueDate: null,
      completedAt: "2026-11-27T01:00:00.000Z",
      createdAt: "2026-11-26T01:00:00.000Z",
      updatedAt: "2026-11-27T01:00:00.000Z",
    };

    const findSpy = vi
      .spyOn(taskCommandRepository, "findRecentByUiOrigin")
      .mockResolvedValue([
        {
          _id: "r1",
          userId: String(userId),
          operation: "update",
          fingerprint: "f1",
          requestId: "req-1",
          taskId: taskDto.id,
          output: { task: taskDto },
          origin: {
            channel: "a2ui",
            conversationId,
            turnId,
            surfaceId,
            actionId,
          },
          createdAt: new Date("2026-11-27T01:00:00.000Z"),
        },
      ] as never);

    const outcomes = await uiActionService.recentOutcomes(
      String(userId),
      conversationId,
    );
    expect(findSpy).toHaveBeenCalledWith(String(userId), conversationId, 3);
    expect(outcomes).toEqual([
      {
        requestId: "req-1",
        actionId,
        outcome: "succeeded",
        task: taskDto,
        turnId,
        surfaceId,
        committedAt: "2026-11-27T01:00:00.000Z",
      },
    ]);
  });
});
