import type {
  ChatCompletionChunk,
  ChatCompletionMessage,
} from "openai/resources/chat/completions.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";

export async function readAiStream(
  chunks: AsyncIterable<ChatCompletionChunk>,
  options: {
    signal: AbortSignal;
    onText(text: string): Promise<void>;
  },
): Promise<ChatCompletionMessage> {
  let accumulatedContent = "";
  const toolCallsByIndex = new Map<
    number,
    {
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }
  >();

  try {
    for await (const chunk of chunks) {
      if (options.signal.aborted) {
        throw new AppError(AI_ERROR.PROVIDER_TIMEOUT, {
          cause: options.signal.reason ?? new Error("Aborted"),
        });
      }

      const choice = chunk.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta;
      if (!delta) continue;

      // Only emit public content; ignore internal reasoning tokens
      if (typeof delta.content === "string" && delta.content.length > 0) {
        accumulatedContent += delta.content;
        await options.onText(delta.content);
      }

      // Assemble fragmented tool call chunks
      if (Array.isArray(delta.tool_calls)) {
        for (const callDelta of delta.tool_calls) {
          const index = callDelta.index ?? 0;
          let existing = toolCallsByIndex.get(index);
          if (!existing) {
            existing = {
              id: callDelta.id || "",
              type: "function",
              function: {
                name: callDelta.function?.name || "",
                arguments: callDelta.function?.arguments || "",
              },
            };
            toolCallsByIndex.set(index, existing);
          } else {
            if (callDelta.id) existing.id = callDelta.id;
            if (callDelta.function?.name) {
              existing.function.name += callDelta.function.name;
            }
            if (callDelta.function?.arguments) {
              existing.function.arguments += callDelta.function.arguments;
            }
          }
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    if (options.signal.aborted) {
      throw new AppError(AI_ERROR.PROVIDER_TIMEOUT, { cause: err });
    }
    throw new AppError(AI_ERROR.PROVIDER_ERROR, { cause: err });
  }

  const toolCalls = Array.from(toolCallsByIndex.entries())
    .sort(([a], [b]) => a - b)
    .map(([, call]) => call);

  return {
    role: "assistant",
    content: accumulatedContent.length > 0 ? accumulatedContent : null,
    refusal: null,
    ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
  };
}
