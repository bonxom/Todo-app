import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

/** DeepSeek requires this field on every assistant message when tools are supplied.
 * Synthetic exchanges and legacy history have no reasoning to replay. Never
 * replace reasoning returned by the provider, and never mutate stored history.
 */
export function prepareAgentProviderMessages(
  messages: ChatCompletionMessageParam[],
  baseURL?: string,
): ChatCompletionMessageParam[] {
  const payload = structuredClone(messages);
  let deepSeek = false;
  try {
    deepSeek = !!baseURL && new URL(baseURL).hostname === "api.deepseek.com";
  } catch {
    // Client configuration validation remains the client's responsibility.
  }
  if (!deepSeek) return payload;
  return payload.map((message) => {
    if (message.role !== "assistant") return message;
    const reasoning = (message as { reasoning_content?: string | null })
      .reasoning_content;
    return { ...message, reasoning_content: reasoning ?? "" };
  });
}
