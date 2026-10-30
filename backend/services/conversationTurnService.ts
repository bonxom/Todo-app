import { createAgentBudget } from "../utils/agentBudget.js";
import type { McpContext } from "../mcp/context.js";
import type { ChatTurn } from "../types/IChatTurn.js";
import type { AgentInteraction } from "../types/IAgent.js";
import { agentService } from "./agentService.js";
import { chatTurnRepository as repository } from "../repositories/chatTurnRepository.js";
import { interruptedReply } from "../utils/interruptedReply.js";
import { AppError } from "../error/AppError.js";
import { prepareHistory } from "../utils/agentMessages.js";
import { resultFor } from "../utils/conversationView.js";

export async function runConversationTurn(
  turn: ChatTurn,
  context: McpContext,
  selectedInteraction?: AgentInteraction,
) {
  const budget = createAgentBudget();
  let latestMessages = turn.messages;
  try {
    if (selectedInteraction?.status === "cancelled") {
      const response =
        "Đã hủy lựa chọn. Các thao tác đã hoàn tất trước đó vẫn được giữ lại.";
      await repository.checkpoint(
        turn._id,
        [...turn.messages, { role: "assistant", content: response }],
        turn.executionToken,
      );
      await repository.finish(
        turn._id,
        response,
        "completed",
        turn.executionToken,
      );
      return resultFor({ ...turn, status: "completed", response });
    }
    const previous = await repository.turns(
      String(context.user._id),
      turn.conversationId,
      turn.sequence,
      20,
    );
    const response = await agentService.chatWithMcp(
      turn.userInput,
      {
        ...context,
        beforeWrite: async () => {
          await context.beforeWrite?.();
          await repository.guardExecution(turn._id, turn.executionToken);
        },
      },
      {
        budget,
        mode: turn.mode ?? "auto",
        history: prepareHistory(previous),
        approvedInteraction:
          selectedInteraction?.kind === "confirmation"
            ? selectedInteraction
            : undefined,
        checkpoint: async (messages) => {
          latestMessages = [...messages];
          await repository.checkpoint(turn._id, messages, turn.executionToken);
        },
      },
    );
    if (typeof response !== "string") {
      await repository.finish(
        turn._id,
        response.interaction.question,
        "completed",
        turn.executionToken,
        response.interaction,
      );
      return resultFor({
        ...turn,
        status: "completed",
        response: response.interaction.question,
        interactions: [...(turn.interactions ?? []), response.interaction],
      });
    }
    await repository.finish(
      turn._id,
      response,
      "completed",
      turn.executionToken,
    );
    return resultFor({ ...turn, status: "completed", response });
  } catch (error) {
    const response = interruptedReply(latestMessages);
    await repository.finish(
      turn._id,
      response,
      "failed",
      turn.executionToken,
    );
    console.warn({
      event: "chat_turn_failed",
      requestId: context.requestId,
      code: error instanceof AppError ? error.code : "INTERNAL_ERROR",
    });
    return resultFor({
      ...turn,
      status: "failed",
      response,
    });
  }
}
