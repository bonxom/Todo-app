import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { buildResponsePage } from "../../utils/pagingUtils.js";
import type { ListPageInput } from "../schemas.js";
import { AppError } from "../../error/AppError.js";
import { TASK_ERROR } from "../../error/definitions/taskErrors.js";
import { COMMON_ERROR } from "../../error/definitions/commonErrors.js";

export function toolSuccess(output: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(output) }],
    structuredContent: output,
  };
}

export function toolFailure(error: unknown): CallToolResult {
  let code = "INTERNAL_ERROR",
    message = "Unable to read data. Try again.",
    retryable = true;
  if (
    error instanceof AppError &&
    (error.code === TASK_ERROR.NOT_FOUND.code ||
      error.code === TASK_ERROR.ACCESS_DENIED.code)
  ) {
    code = "NOT_FOUND";
    message = "Task not found or not accessible.";
    retryable = false;
  } else if (
    error instanceof AppError &&
    error.code === COMMON_ERROR.INVALID_PAYLOAD.code
  ) {
    code = "INVALID_ARGUMENT";
    message = "Check the tool arguments.";
    retryable = false;
  } else if (
    error instanceof Error &&
    [
      "MongoNetworkError",
      "MongoServerSelectionError",
      "MongooseServerSelectionError",
    ].includes(error.name)
  ) {
    code = "SERVICE_UNAVAILABLE";
    message = "Data service unavailable. Try again.";
  }
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: { code, message, retryable } }),
      },
    ],
  };
}

export const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
export async function read(
  operation: () => Promise<Record<string, unknown>>,
): Promise<CallToolResult> {
  try {
    return toolSuccess(await operation());
  } catch (error) {
    return toolFailure(error);
  }
}
export function page<T>(
  items: T[],
  input: ListPageInput,
  id: (item: T) => string,
) {
  const sorted = [...items].sort((a, b) => id(a).localeCompare(id(b)));
  return buildResponsePage(
    sorted.slice(
      (input.pageNo - 1) * input.pageSize,
      input.pageNo * input.pageSize,
    ),
    sorted.length,
    input.pageNo,
    input.pageSize,
  );
}
