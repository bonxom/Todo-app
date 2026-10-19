import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { McpContext } from "../mcp/context.js";
import { aiService } from "./aiService.js";
import { conversationRepository as repository, INTERRUPTED_REPLY } from "../repositories/conversationRepository.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";
import { publicInteraction, type AgentInteraction, type AgentMode } from "./agentInteraction.js";
import type { ChatTurn } from "../models/ChatTurn.js";
import type { InteractionAnswer } from "../repositories/conversationRepository.js";

// Preserve complete turn boundaries and valid assistant/tool pairs. An interrupted
// tool call is explicitly uncertain; memory must never imply it can safely repeat.
export function prepareHistory(turns: Array<{ messages: ChatCompletionMessageParam[]; status?: string; response?: string }>) {
  const history: ChatCompletionMessageParam[] = [];
  let size = 0;
  for (const turn of turns) { // newest first
    if (turn.status === "awaiting_user") continue;
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
    if ((turn.status === "failed" || turn.status === "cancelled") && turn.response) {
      messages.push({ role: "assistant", content: turn.response });
    }
    const length = JSON.stringify(messages).length;
    if (size + length > 60000) break;
    history.unshift(...messages);
    size += length;
  }
  return history;
}

function resultFor(turn: Pick<ChatTurn, "conversationId" | "requestId" | "status" | "response" | "interactions" | "expiresAt">) {
  const expired = turn.status === "processing" && turn.expiresAt.getTime() <= Date.now();
  const interaction = turn.interactions?.find((i) => i.status === "pending");
  return {
    data: expired ? INTERRUPTED_REPLY : turn.response,
    conversationId: turn.conversationId, requestId: turn.requestId,
    status: expired ? "failed" as const : turn.status,
    ...(turn.status === "awaiting_user" && interaction ? { interaction: publicInteraction(interaction) } : {}),
  };
}

async function run(turn: ChatTurn, context: McpContext, resume = false, approvedInteraction?: AgentInteraction) {
  try {
    const previous = await repository.turns(String(context.user._id), turn.conversationId, turn.sequence, 20);
    const response = await aiService.chatWithMcp(turn.userInput, {
      ...context,
      beforeWrite: async () => {
        await context.beforeWrite?.();
        await repository.guardExecution(turn._id, turn.executionToken);
      },
    }, {
      mode: turn.mode ?? "auto",
      history: prepareHistory(previous),
      ...(resume ? { resumeMessages: turn.messages } : {}),
      interactions: turn.interactions ?? [],
      approvedInteraction,
      checkpoint: (messages) => repository.checkpoint(turn._id, messages, turn.executionToken),
    });
    if (typeof response !== "string") {
      await repository.pause(turn._id, response.interaction, turn.executionToken);
      return resultFor({ ...turn, status: "awaiting_user", response: "", interactions: [...(turn.interactions ?? []), response.interaction] });
    }
    await repository.finish(turn._id, response, "completed", turn.executionToken);
    return resultFor({ ...turn, status: "completed", response });
  } catch (error) {
    await repository.finish(turn._id, INTERRUPTED_REPLY, "failed", turn.executionToken);
    console.warn({ event: "chat_turn_failed", requestId: context.requestId, code: error instanceof AppError ? error.code : "INTERNAL_ERROR" });
    return resultFor({ ...turn, status: "failed", response: INTERRUPTED_REPLY });
  }
}

export const conversationService = {
  create: (userId: string, id: string) => repository.create(userId, id),
  async get(userId: string, id?: string, before?: number) {
    const conversation = id ? await repository.get(userId, id) : await repository.latest(userId);
    if (!conversation) return null;
    const rows = await repository.turns(userId, conversation._id, before, 51);
    const hasMore = rows.length > 50;
    const visible = rows.slice(0, 50).reverse();
    const activeTurn = await repository.active(userId, conversation._id, conversation.activeTurn);
    const interaction = activeTurn?.status === "awaiting_user" ? activeTurn.interactions?.find((i) => i.status === "pending") : undefined;
    return {
      conversationId: conversation._id, title: conversation.title,
      mode: conversation.mode ?? "auto",
      ...(interaction ? { interaction: publicInteraction(interaction) } : {}),
      before: hasMore ? visible[0].sequence : null,
      messages: visible.flatMap((turn) => {
        const expired = turn.status === "processing" && turn.expiresAt.getTime() < Date.now();
        return [{ id: `${turn._id}:user`, sender: "user", text: turn.userInput, timestamp: turn.createdAt.toISOString() },
          ...(turn.interactions ?? []).filter((i) => i.status !== "pending").map((i) => ({
            id: `${turn._id}:${i.id}`, sender: "bot", text: i.question, timestamp: turn.updatedAt.toISOString(), interaction: publicInteraction(i),
          })),
          ...(turn.response || expired ? [{ id: `${turn._id}:bot`, sender: "bot", text: turn.response || INTERRUPTED_REPLY, timestamp: turn.updatedAt.toISOString() }] : [])];
      }),
      pending: activeTurn?.status === "processing" && activeTurn.expiresAt.getTime() > Date.now()
        ? [{ requestId: activeTurn.requestId, userInput: activeTurn.userInput, mode: activeTurn.mode ?? "auto" }] : [],
    };
  },
  async send(input: { conversationId: string; requestId: string; userInput: string; mode?: AgentMode }, context: McpContext) {
    const userId = String(context.user._id);
    const { turn, claimed } = await repository.claim(userId, input.conversationId, input.requestId, input.userInput, input.mode ?? "auto");
    if (!claimed) {
      if (turn.status === "processing" && turn.expiresAt.getTime() > Date.now()) throw new AppError(AI_ERROR.CONVERSATION_BUSY);
      return resultFor(turn);
    }
    return run(turn.toObject(), context);
  },
  async answer(conversationId: string, interactionId: string, input: InteractionAnswer, context: McpContext, cancel = false) {
    const { turn, interaction, claimed } = await repository.answer(String(context.user._id), conversationId, interactionId, input, cancel);
    if (!claimed) return resultFor(turn);
    return run(turn.toObject(), context, true, interaction.kind === "confirmation" ? interaction : undefined);
  },
};
