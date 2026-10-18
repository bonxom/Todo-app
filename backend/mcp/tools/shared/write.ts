import { ZodError } from "zod";
import type { McpContext } from "../../context.js";
import {
  WriteError,
  type WriteOperation,
} from "../../services/taskWriteService.js";
import { AppError } from "../../../error/AppError.js";
import { toolSuccess, toolFailure } from "./common.js";

export async function write(
  context: McpContext,
  operation: WriteOperation,
  run: () => Promise<Record<string, unknown>>,
) {
  try {
    return toolSuccess(await run());
  } catch (error) {
    console.warn({
      event: "mcp_write_failed",
      operation,
      userId: String(context.user._id),
      requestId: context.requestId,
      code:
        error instanceof WriteError || error instanceof AppError
          ? error.code
          : "INTERNAL_ERROR",
    });
    if (
      error instanceof WriteError ||
      error instanceof ZodError ||
      (error instanceof AppError &&
        error.statusCode >= 400 &&
        error.statusCode < 500)
    ) {
      const code =
        error instanceof WriteError
          ? error.code
          : error instanceof ZodError ||
              (error instanceof AppError && error.statusCode === 422)
            ? "INVALID_ARGUMENT"
            : "NOT_FOUND";
      const message =
        error instanceof WriteError
          ? error.message
          : code === "NOT_FOUND"
            ? "Task or reference not found or not accessible."
            : "Check the arguments and current task state before trying again.";
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: { code, message, retryable: false },
            }),
          },
        ],
      };
    }
    return toolFailure(error);
  }
}

export const writeAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};
