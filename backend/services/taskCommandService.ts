import { createHash } from "node:crypto";
import type { ZodType } from "zod";
import { AppError } from "../error/AppError.js";
import { COMMON_ERROR } from "../error/definitions/commonErrors.js";
import { TASK_ERROR } from "../error/definitions/taskErrors.js";
import { taskCommandRepository } from "../repositories/taskCommandRepository.js";
import type { ITaskDocument } from "../types/ITask.js";
import type {
  TaskCommandContext,
  TaskCommandOperation,
  TaskCommandOutput,
  UiCommandOrigin,
} from "../types/ITaskCommand.js";
import { getStartOfToday } from "../utils/dateTime.js";
import { toTaskDto } from "../utils/taskDto.js";
import {
  createTaskInputSchema,
  deleteTaskInputSchema,
  updateTaskInputSchema,
} from "../validations/taskCommandValidation.js";
import { statService } from "./statService.js";
import { taskService } from "./taskService.js";

export class TaskCommandError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const WriteError = TaskCommandError;
export type WriteOperation = TaskCommandOperation;

const canonical = (value: unknown): string => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const checkDates = (start: unknown, due: unknown) => {
  if (
    start &&
    due &&
    new Date(start as string).getTime() > new Date(due as string).getTime()
  ) {
    throw new AppError(COMMON_ERROR.INVALID_PAYLOAD);
  }
};

const sameOrigin = (
  a?: UiCommandOrigin | null,
  b?: UiCommandOrigin | null,
): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.channel === b.channel &&
    a.conversationId === b.conversationId &&
    a.turnId === b.turnId &&
    a.surfaceId === b.surfaceId &&
    a.actionId === b.actionId
  );
};

async function executeWrite<T extends { idempotencyKey: string }>(
  operation: TaskCommandOperation,
  raw: unknown,
  schema: ZodType<T>,
  context: TaskCommandContext,
  mutate: (input: T) => Promise<ITaskDocument | null>,
): Promise<TaskCommandOutput> {
  if (context.user.role !== "USER") {
    throw new TaskCommandError(
      "FORBIDDEN",
      "Task commands are available to USER accounts only.",
    );
  }
  const input = schema.parse(raw);
  const userId = String(context.user._id);
  const receiptId = hash(`${userId}:${input.idempotencyKey}`);
  const fingerprint = hash(canonical({ operation, input }));

  return taskCommandRepository.transaction(userId, async () => {
    const previous = await taskCommandRepository.findReceipt(receiptId);
    if (previous) {
      if (
        previous.fingerprint !== fingerprint ||
        !sameOrigin(context.origin, previous.origin)
      ) {
        throw new TaskCommandError(
          "IDEMPOTENCY_CONFLICT",
          "This key was already used for different arguments. Use the original arguments for a retry.",
        );
      }
      // A committed deletion receipt is the owned result: the task no longer exists.
      if (operation !== "delete") {
        await taskService.getById(previous.taskId, context.user);
      }
      return previous.output;
    }

    await context.beforeWrite?.();
    const task = await mutate(input);
    if (!task) throw new AppError(TASK_ERROR.NOT_FOUND);
    // Keep category totals accurate after content/category changes, too.
    await statService.getStats(context.user);

    const output: TaskCommandOutput = {
      task: toTaskDto(task),
      ...(operation === "delete" ? { deleted: true as const } : {}),
    };

    await taskCommandRepository.saveReceipt({
      _id: receiptId,
      userId,
      operation,
      fingerprint,
      requestId: context.requestId,
      taskId: String(task._id),
      output,
      ...(context.origin ? { origin: context.origin } : {}),
    });

    return output;
  });
}

export const taskCommandService = {
  delete(
    raw: unknown,
    context: TaskCommandContext,
  ): Promise<TaskCommandOutput> {
    return executeWrite(
      "delete",
      raw,
      deleteTaskInputSchema,
      context,
      async ({ taskId }) => {
        const task = await taskService.getById(taskId, context.user);
        await taskService.delete(taskId, context.user);
        return task;
      },
    );
  },

  create(
    raw: unknown,
    context: TaskCommandContext,
  ): Promise<TaskCommandOutput> {
    return executeWrite(
      "create",
      raw,
      createTaskInputSchema,
      context,
      async (input) => {
        const { idempotencyKey: _key, ...data } = input;
        checkDates(
          data.startDate === undefined ? getStartOfToday() : data.startDate,
          data.dueDate,
        );
        return taskService.create(data, context.user._id, "pending");
      },
    );
  },

  update(
    raw: unknown,
    context: TaskCommandContext,
  ): Promise<TaskCommandOutput> {
    return executeWrite(
      "update",
      raw,
      updateTaskInputSchema,
      context,
      async ({ taskId, changes }) => {
        let task = await taskService.getById(taskId, context.user);
        const { status, ...fields } = changes;
        if (Object.keys(fields).length > 0) {
          checkDates(
            fields.startDate === undefined ? task.startDate : fields.startDate,
            fields.dueDate === undefined ? task.dueDate : fields.dueDate,
          );
          const updated = await taskService.update(
            taskId,
            fields,
            context.user,
          );
          if (!updated) throw new AppError(TASK_ERROR.NOT_FOUND);
          task = updated;
        }
        // Use lifecycle services so guards, timestamps and stats remain correct.
        // Both metadata and status changes are covered by executeWrite's transaction.
        if (!status || task.status === status) return task;
        switch (status) {
          case "in-progress":
            return taskService.start(taskId, context.user);
          case "completed":
            return taskService.finish(taskId, context.user);
          case "given-up":
            return taskService.giveUp(taskId, context.user);
        }
      },
    );
  },
};
