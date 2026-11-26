import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../error/AppError.js";
import { TASK_ERROR } from "../../error/definitions/taskErrors.js";
import { taskCommandRepository } from "../../repositories/taskCommandRepository.js";
import type { ITaskDocument } from "../../types/ITask.js";
import type {
  TaskCommandContext,
  UiCommandOrigin,
} from "../../types/ITaskCommand.js";
import type { IUserDocument } from "../../types/IUser.js";
import { statService } from "../statService.js";
import { taskCommandService } from "../taskCommandService.js";
import { taskService } from "../taskService.js";

describe("taskCommandService", () => {
  const userId = new Types.ObjectId();
  const categoryId = new Types.ObjectId();
  const taskId = new Types.ObjectId();

  const makeUser = (role: "USER" | "ADMIN" = "USER"): IUserDocument =>
    ({ _id: userId, role }) as IUserDocument;

  const makeTask = (
    status:
      "pending" | "in-progress" | "completed" | "given-up" = "in-progress",
  ): ITaskDocument =>
    ({
      _id: taskId,
      title: "Shared command task",
      description: null,
      status,
      priority: "Medium",
      categoryId,
      projectId: null,
      startDate: null,
      dueDate: null,
      completedAt:
        status === "completed" ? new Date("2026-11-20T10:00:00Z") : null,
      createdAt: new Date("2026-11-20T09:00:00Z"),
      updatedAt: new Date("2026-11-20T09:30:00Z"),
    }) as unknown as ITaskDocument;

  const makeContext = (
    overrides: Partial<TaskCommandContext> = {},
  ): TaskCommandContext => ({
    user: makeUser(),
    requestId: randomUUID(),
    ...overrides,
  });

  beforeEach(() => {
    vi.spyOn(taskCommandRepository, "transaction").mockImplementation(
      async (_userId, run) => run({} as never),
    );
    vi.spyOn(taskCommandRepository, "findReceipt").mockResolvedValue(null);
    vi.spyOn(taskCommandRepository, "saveReceipt").mockResolvedValue(
      {} as never,
    );
    vi.spyOn(statService, "getStats").mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("wraps mutation, stats rebuild and receipt save inside transaction", async () => {
    const order: string[] = [];
    vi.mocked(taskCommandRepository.transaction).mockImplementation(
      async (_uid, run) => {
        order.push("tx:start");
        const result = await run({} as never);
        order.push("tx:end");
        return result;
      },
    );
    vi.mocked(taskCommandRepository.findReceipt).mockImplementation(
      async () => {
        order.push("findReceipt");
        return null;
      },
    );
    vi.spyOn(taskService, "getById").mockImplementation(async () => {
      order.push("getById");
      return makeTask("in-progress");
    });
    vi.spyOn(taskService, "finish").mockImplementation(async () => {
      order.push("finish");
      return makeTask("completed");
    });
    vi.mocked(statService.getStats).mockImplementation(async () => {
      order.push("getStats");
      return {} as never;
    });
    vi.mocked(taskCommandRepository.saveReceipt).mockImplementation(
      async () => {
        order.push("saveReceipt");
        return {} as never;
      },
    );

    const ctx = makeContext({
      beforeWrite: async () => {
        order.push("beforeWrite");
      },
    });
    const output = await taskCommandService.update(
      {
        taskId: String(taskId),
        changes: { status: "completed" },
        idempotencyKey: `ui_${randomUUID()}`,
      },
      ctx,
    );

    expect(output.task.status).toBe("completed");
    expect(order).toEqual([
      "tx:start",
      "findReceipt",
      "beforeWrite",
      "getById",
      "finish",
      "getStats",
      "saveReceipt",
      "tx:end",
    ]);
  });

  it("prevents all mutation if beforeWrite rejects", async () => {
    const createSpy = vi.spyOn(taskService, "create");
    const updateSpy = vi.spyOn(taskService, "update");
    const finishSpy = vi.spyOn(taskService, "finish");

    await expect(
      taskCommandService.create(
        { title: "Blocked", idempotencyKey: randomUUID() },
        makeContext({
          beforeWrite: async () => {
            throw new Error("turn expired");
          },
        }),
      ),
    ).rejects.toThrow("turn expired");

    expect(createSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(finishSpy).not.toHaveBeenCalled();
    expect(statService.getStats).not.toHaveBeenCalled();
    expect(taskCommandRepository.saveReceipt).not.toHaveBeenCalled();
  });

  it("treats completing an already completed task as a safe no-op", async () => {
    const completedTask = makeTask("completed");
    vi.spyOn(taskService, "getById").mockResolvedValue(completedTask);
    const finishSpy = vi.spyOn(taskService, "finish");

    const output = await taskCommandService.update(
      {
        taskId: String(taskId),
        changes: { status: "completed" },
        idempotencyKey: `ui_${randomUUID()}`,
      },
      makeContext(),
    );

    expect(finishSpy).not.toHaveBeenCalled();
    expect(output.task.status).toBe("completed");
    expect(taskCommandRepository.saveReceipt).toHaveBeenCalledOnce();
  });

  it.each(["pending", "given-up"] as const)(
    "rejects completing a %s task via taskService.finish",
    async (status) => {
      vi.spyOn(taskService, "getById").mockResolvedValue(makeTask(status));
      vi.spyOn(taskService, "finish").mockRejectedValue(
        new AppError(TASK_ERROR.CANNOT_FINISH),
      );

      await expect(
        taskCommandService.update(
          {
            taskId: String(taskId),
            changes: { status: "completed" },
            idempotencyKey: `ui_${randomUUID()}`,
          },
          makeContext(),
        ),
      ).rejects.toMatchObject({
        code: TASK_ERROR.CANNOT_FINISH.code,
        statusCode: 422,
      });

      expect(taskCommandRepository.saveReceipt).not.toHaveBeenCalled();
    },
  );

  it("enforces matching origin on receipt replay and rejects missing or mismatched origin", async () => {
    const origin: UiCommandOrigin = {
      channel: "a2ui",
      conversationId: randomUUID(),
      turnId: randomUUID(),
      surfaceId: randomUUID(),
      actionId: randomUUID(),
    };
    const input = {
      taskId: String(taskId),
      changes: { status: "completed" as const },
      idempotencyKey: `ui_${randomUUID()}`,
    };

    vi.spyOn(taskService, "getById").mockResolvedValue(makeTask("in-progress"));
    vi.spyOn(taskService, "finish").mockResolvedValue(makeTask("completed"));

    const first = await taskCommandService.update(
      input,
      makeContext({ origin }),
    );
    const saved = vi.mocked(taskCommandRepository.saveReceipt).mock
      .calls[0]![0];
    expect(saved.origin).toEqual(origin);

    vi.mocked(taskCommandRepository.findReceipt).mockResolvedValue(
      saved as never,
    );
    vi.spyOn(taskService, "getById").mockResolvedValue(makeTask("completed"));

    const replay = await taskCommandService.update(
      input,
      makeContext({ origin: { ...origin } }),
    );
    expect(replay).toEqual(first);
    expect(taskService.finish).toHaveBeenCalledTimes(1);

    await expect(
      taskCommandService.update(
        input,
        makeContext({ origin: { ...origin, surfaceId: randomUUID() } }),
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });

    await expect(
      taskCommandService.update(input, makeContext({ origin: undefined })),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
});
