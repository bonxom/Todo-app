import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import { INTERRUPTED_REPLY, WRITE_TOOLS } from "../constants/agent.js";

// Only actual successful MCP results are evidence of a committed write.
// A model call, approval or question_displayed result alone proves nothing.
export function interruptedReply(messages: ChatCompletionMessageParam[] = []) {
  const calls = new Map(
    messages.flatMap((message) =>
      message.role === "assistant"
        ? (message.tool_calls ?? [])
            .filter((call) => call.type === "function")
            .map((call) => [call.id, call.function.name] as const)
        : [],
    ),
  );
  const confirmed = new Map<string, string>();
  for (const message of messages) {
    if (message.role !== "tool" || typeof message.content !== "string") continue;
    const name = calls.get(message.tool_call_id);
    if (!name || !WRITE_TOOLS.has(name)) continue;
    try {
      const result = JSON.parse(message.content);
      const task = result?.structuredContent?.task;
      if (
        result.isError ||
        typeof task?.id !== "string" ||
        typeof task?.title !== "string"
      ) continue;
      confirmed.set(
        message.tool_call_id,
        `Đã ${name === "orbit_create_task" ? "tạo" : "cập nhật"} công việc: ${task.title.replace(/[\r\n]+/g, " ")}.`,
      );
    } catch {
      // Truncated or malformed results cannot establish success.
    }
  }
  if (!confirmed.size) return INTERRUPTED_REPLY;
  const unresolved = [...calls].some(
    ([id, name]) => WRITE_TOOLS.has(name) && !confirmed.has(id),
  );
  return [
    ...confirmed.values(),
    ...(unresolved
      ? ["Các thao tác còn lại chưa được xác nhận thành công. Hãy kiểm tra danh sách công việc trước khi yêu cầu thực hiện lại."]
      : []),
  ].join("\n");
}
