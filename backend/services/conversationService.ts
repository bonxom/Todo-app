import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { McpContext } from "../mcp/context.js";
import { aiService } from "./aiService.js";
import { conversationRepository as repository, INTERRUPTED_REPLY } from "../repositories/conversationRepository.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";

// Preserve complete turn boundaries and valid assistant/tool pairs. An interrupted
// tool call is explicitly uncertain; memory must never imply it can safely repeat.
export function prepareHistory(turns: Array<{ messages: ChatCompletionMessageParam[]; status?: string; response?: string }>) {
  const history: ChatCompletionMessageParam[] = [];
  let size = 0;
  for (const turn of turns) { // newest first
    const messages = [...turn.messages];
    const results = new Set(messages.filter((m) => m.role === "tool").map((m) => m.tool_call_id));
    for (const message of turn.messages) {
      if (message.role === "assistant" && message.tool_calls) {
        for (const call of message.tool_calls) {
          if (!results.has(call.id)) messages.push({ role: "tool", tool_call_id: call.id,
            content: "Execution outcome unknown due to interruption. Read current data before acting; do not automatically repeat this write." });
        }
      }
    }
    if (turn.status === "failed" && turn.response) {
      messages.push({ role: "assistant", content: turn.response });
    }
    const length = JSON.stringify(messages).length;
    if (size + length > 60000) break;
    history.unshift(...messages);
    size += length;
  }
  return history;
}

export const conversationService = {
  create: (userId: string, id: string) => repository.create(userId, id),
  async get(userId: string, id?: string, before?: number) {
    const conversation = id ? await repository.get(userId, id) : await repository.latest(userId);
    if (!conversation) return null;
    const rows = await repository.turns(userId, conversation._id, before, 51);
    const hasMore = rows.length > 50;
    const visible = rows.slice(0, 50).reverse();
    return {
      conversationId: conversation._id, title: conversation.title,
      before: hasMore ? visible[0].sequence : null,
      messages: visible.flatMap((turn) => {
        const expired = turn.status === "processing" && turn.expiresAt.getTime() < Date.now();
        return [{ id: `${turn._id}:user`, sender: "user", text: turn.userInput, timestamp: turn.createdAt.toISOString() },
          ...(turn.response || expired ? [{ id: `${turn._id}:bot`, sender: "bot", text: turn.response || INTERRUPTED_REPLY, timestamp: turn.updatedAt.toISOString() }] : [])];
      }),
      pending: visible.filter((t) => t.status === "processing" && t.expiresAt.getTime() > Date.now()).map((t) => ({ requestId: t.requestId, userInput: t.userInput })),
    };
  },
  async send(input: { conversationId: string; requestId: string; userInput: string }, context: McpContext) {
    const userId = String(context.user._id);
    const { turn, claimed } = await repository.claim(userId, input.conversationId, input.requestId, input.userInput);
    if (!claimed) {
      if (turn.status === "processing" && turn.expiresAt.getTime() > Date.now()) throw new AppError(AI_ERROR.CONVERSATION_BUSY);
      return { data: turn.response || INTERRUPTED_REPLY, conversationId: turn.conversationId, requestId: turn.requestId, status: turn.status === "processing" ? "failed" : turn.status };
    }
    try {
      const previous = await repository.turns(userId, input.conversationId, turn.sequence, 20);
      const response = await aiService.chatWithMcp(input.userInput, context, {
        history: prepareHistory(previous),
        checkpoint: (messages) => repository.checkpoint(turn._id, messages),
      });
      await repository.finish(turn._id, response, "completed");
      return { data: response, conversationId: input.conversationId, requestId: input.requestId, status: "completed" };
    } catch (error) {
      await repository.finish(turn._id, INTERRUPTED_REPLY, "failed");
      // Durable failed turn is never automatically executed again, even on retry.
      console.warn({ event: "chat_turn_failed", requestId: context.requestId, code: error instanceof AppError ? error.code : "INTERNAL_ERROR" });
      return { data: INTERRUPTED_REPLY, conversationId: input.conversationId, requestId: input.requestId, status: "failed" };
    }
  },
};
