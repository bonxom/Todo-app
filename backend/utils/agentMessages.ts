import type { AgentInteraction } from "../types/IAgent.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

export function pendingCalls(messages: ChatCompletionMessageParam[]) {
  const answered = new Set(
    messages.filter((m) => m.role === "tool").map((m) => m.tool_call_id),
  );
  return messages
    .flatMap((m) => (m.role === "assistant" ? (m.tool_calls ?? []) : []))
    .filter((c) => !answered.has(c.id));
}
export function completeMenuMessages(
  messages: ChatCompletionMessageParam[],
  interaction: AgentInteraction,
): ChatCompletionMessageParam[] {
  return [
    ...messages,
    ...pendingCalls(messages).map((call) => ({
      role: "tool" as const,
      tool_call_id: call.id,
      content: JSON.stringify(
        call.id === interaction.toolCallId
          ? {
              status: "question_displayed",
              executed: false,
              question: interaction.question,
              options: interaction.options,
              allowCustomAnswer: interaction.allowCustomAnswer,
            }
          : {
              status: "skipped",
              executed: false,
              reason: "This turn ended with a question for the user.",
            },
      ),
    })),
    { role: "assistant", content: interaction.question },
  ];
}

// Preserve complete turn boundaries and valid assistant/tool pairs. An interrupted
// tool call is explicitly uncertain; memory must never imply it can safely repeat.
export function prepareHistory(
  turns: Array<{
    messages: ChatCompletionMessageParam[];
    status?: string;
    response?: string;
  }>,
) {
  const history: ChatCompletionMessageParam[] = [];
  let size = 0;
  for (const turn of turns) {
    // newest first
    if (turn.status === "awaiting_user") continue;
    const messages = [...turn.messages];
    const results = new Set(
      messages.filter((m) => m.role === "tool").map((m) => m.tool_call_id),
    );
    for (const message of turn.messages) {
      if (message.role === "assistant" && message.tool_calls) {
        for (const call of message.tool_calls) {
          if (!results.has(call.id))
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content:
                "Execution outcome unknown due to interruption. Read current data before acting; do not automatically repeat this write.",
            });
        }
      }
    }
    if (
      (turn.status === "failed" || turn.status === "cancelled") &&
      turn.response
    ) {
      messages.push({ role: "assistant", content: turn.response });
    }
    const length = JSON.stringify(messages).length;
    if (size + length > 60000) break;
    history.unshift(...messages);
    size += length;
  }
  return history;
}
