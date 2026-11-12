import { z } from "zod";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";
import { healDsmlToolCalls, type RawAgentMessage } from "./dsmlParser.js";
const messageSchema = z.object({
  role: z.literal("assistant"),
  reasoning_content: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  tool_calls: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.literal("function"),
        function: z.object({ name: z.string().min(1), arguments: z.string() }),
      }),
    )
    .optional(),
});

export function validateAgentResponse(
  value: unknown,
  finalOnly: boolean,
  seen: ReadonlySet<string>,
) {
  let normalizedValue = value;
  if (
    !finalOnly &&
    normalizedValue &&
    typeof normalizedValue === "object" &&
    "role" in normalizedValue &&
    normalizedValue.role === "assistant"
  ) {
    normalizedValue = healDsmlToolCalls(normalizedValue as RawAgentMessage);
  }

  const parsed = messageSchema.safeParse(normalizedValue);
  if (!parsed.success) throw new AppError(AI_ERROR.RESPONSE_INVALID);
  const message = parsed.data;
  const calls = message.tool_calls ?? [];
  if (
    (finalOnly && calls.length) ||
    (!calls.length && !message.content?.trim())
  ) {
    throw new AppError(AI_ERROR.RESPONSE_INVALID);
  }
  const ids = new Set<string>();
  for (const call of calls) {
    if (ids.has(call.id) || seen.has(call.id))
      throw new AppError(AI_ERROR.RESPONSE_INVALID);
    ids.add(call.id);
  }
  return message;
}
