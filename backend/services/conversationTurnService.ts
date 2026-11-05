import { createAgentBudget } from "../utils/agentBudget.js";
import type { McpContext } from "../mcp/context.js";
import type { ChatTurn } from "../types/IChatTurn.js";
import type { AgentInteraction } from "../types/IAgent.js";
import type { ProposalItem } from "../types/A2UI/ITaskProposal.js";
import { agentService } from "./agentService.js";
import { chatTurnRepository as repository } from "../repositories/chatTurnRepository.js";
import { interruptedReply } from "../utils/interruptedReply.js";
import { AppError } from "../error/AppError.js";
import { TASK_PROPOSAL_ERROR } from "../error/definitions/A2UI/taskProposalErrors.js";
import { prepareHistory } from "../utils/agentMessages.js";
import { resultFor } from "../utils/conversationView.js";
import {
  taskProposalGenerationService,
  toProposalView,
} from "./A2UI/taskProposalGenerationService.js";
import { taskProposalUiService } from "./A2UI/taskProposalUiService.js";
import { isTaskProposalsEnabled } from "../config/A2UI/a2ui.js";

export async function runConversationTurn(
  turn: ChatTurn,
  context: McpContext,
  selectedInteraction?: AgentInteraction,
) {
  const budget = createAgentBudget();
  let latestMessages = turn.messages;
  try {
    if (selectedInteraction?.status === "cancelled") {
      const response = "";
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
          if (turn.intent === "task_proposal") {
            throw new AppError(TASK_PROPOSAL_ERROR.WRITE_FORBIDDEN);
          }
          await repository.guardExecution(turn._id, turn.executionToken);
        },
      },
      {
        budget,
        mode: turn.mode ?? "auto",
        intent: turn.intent,
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
      if ("interaction" in response) {
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
      if ("proposalItems" in response) {
        let preparedItems: ProposalItem[];
        try {
          preparedItems = await taskProposalGenerationService.prepare(
            response.proposalItems,
            context,
          );
        } catch {
          const guidance =
            "Đề xuất công việc không hợp lệ. Vui lòng thử lại với các thông tin rõ ràng hơn.";
          await repository.finish(
            turn._id,
            guidance,
            "completed",
            turn.executionToken,
          );
          return resultFor({
            ...turn,
            status: "completed",
            response: guidance,
          });
        }
        const finalResponse =
          response.text ||
          "Tôi đã tạo đề xuất các công việc cho bạn. Vui lòng xem lại và xác nhận.";
        const proposal = await repository.finishWithProposal(
          turn._id,
          turn.executionToken,
          preparedItems,
          finalResponse,
        );
        const envelope = proposal
          ? taskProposalUiService.present(
              toProposalView(proposal),
              isTaskProposalsEnabled(),
            )
          : undefined;
        return resultFor(
          {
            ...turn,
            status: "completed",
            response: finalResponse,
          },
          envelope
            ? { proposal: envelope.proposal, a2ui: envelope.a2ui }
            : undefined,
        );
      }
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
    await repository.finish(turn._id, response, "failed", turn.executionToken);
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
