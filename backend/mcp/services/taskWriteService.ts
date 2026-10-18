import type { ZodType } from "zod";
import type { ITaskDocument } from "../../types/ITask.js";
import { createHash } from "node:crypto";
import { AppError } from "../../error/AppError.js";
import { TASK_ERROR } from "../../error/definitions/taskErrors.js";
import { COMMON_ERROR } from "../../error/definitions/commonErrors.js";
import { taskService } from "../../services/taskService.js";
import { statService } from "../../services/statService.js";
import type { McpContext } from "../context.js";
import { toTaskDto } from "../mapper/taskMapper.js";
import { writeRepository } from "../repositories/writeRepository.js";
import {
  createTaskInputSchema,
  updateTaskInputSchema,
} from "../models/TaskWrite.js";
import { getStartOfToday } from "../../utils/dateTime.js";

export type WriteOperation =
  "create" | "update";
export class WriteError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
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

async function executeWrite<T extends { idempotencyKey: string }>(
  operation: WriteOperation,
  raw: unknown,
  schema: ZodType<T>,
  context: McpContext,
  mutate: (input: T) => Promise<ITaskDocument | null>,
) {
  if (
    context.user.role !== "USER" ||
    !context.scopes?.includes("tasks:write")
  ) {
    throw new WriteError(
      "FORBIDDEN",
      "This session does not have tasks:write permission.",
    );
  }
  const input = schema.parse(raw);
  const userId = String(context.user._id);
  const receiptId = hash(`${userId}:${input.idempotencyKey}`);
  const fingerprint = hash(canonical({ operation, input }));
  return writeRepository.transaction(userId, async () => {
    const previous = await writeRepository.findReceipt(receiptId);
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        throw new WriteError(
          "IDEMPOTENCY_CONFLICT",
          "This key was already used for different arguments. Use the original arguments for a retry.",
        );
      }
      await taskService.getById(previous.taskId, context.user);
      return previous.output;
    }
    const task = await mutate(input);
    if (!task) throw new AppError(TASK_ERROR.NOT_FOUND);
    // Keep category totals accurate after content/category changes, too.
    await statService.getStats(context.user);
    const output = { task: toTaskDto(task) };
    await writeRepository.saveReceipt({
      _id: receiptId,
      userId,
      operation,
      fingerprint,
      requestId: context.requestId,
      taskId: String(task._id),
      output,
    });
    return output;
  });
}

export const taskWriteService = {
  create(raw: unknown, context: McpContext) {
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
        return taskService.create(data, context.user._id);
      },
    );
  },

  update(raw: unknown, context: McpContext) {
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
          const updated = await taskService.update(taskId, fields, context.user);
          if (!updated) throw new AppError(TASK_ERROR.NOT_FOUND);
          task = updated;
        }
        // Use lifecycle services so guards, timestamps and stats remain correct.
        // Both metadata and status changes are covered by executeWrite's transaction.
        if (!status || task.status === status) return task;
        switch (status) {
          case "in-progress": return taskService.start(taskId, context.user);
          case "completed": return taskService.finish(taskId, context.user);
          case "given-up": return taskService.giveUp(taskId, context.user);
        }
      },
    );
  },
};
