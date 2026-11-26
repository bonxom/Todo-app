import type { McpContext } from "../context.js";
import {
  taskCommandService,
  WriteError,
  type WriteOperation,
} from "../../services/taskCommandService.js";
import type { TaskCommandContext } from "../../types/ITaskCommand.js";

export { WriteError, type WriteOperation };

function assertWriteAccess(context: McpContext): TaskCommandContext {
  if (
    context.user.role !== "USER" ||
    !context.scopes?.includes("tasks:write")
  ) {
    throw new WriteError(
      "FORBIDDEN",
      "This session does not have tasks:write permission.",
    );
  }
  return {
    user: context.user,
    requestId: context.requestId,
    beforeWrite: context.beforeWrite,
  };
}

export const taskWriteService = {
  async delete(raw: unknown, context: McpContext) {
    return taskCommandService.delete(raw, assertWriteAccess(context));
  },

  async create(raw: unknown, context: McpContext) {
    return taskCommandService.create(raw, assertWriteAccess(context));
  },

  async update(raw: unknown, context: McpContext) {
    return taskCommandService.update(raw, assertWriteAccess(context));
  },
};
