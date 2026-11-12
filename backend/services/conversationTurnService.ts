import { attachmentVisionService } from "./attachmentVisionService.js";
import { createAgentTimeContext } from "../utils/agentTimeContext.js";
import { createAgentBudget } from "../utils/agentBudget.js";
import type { McpContext } from "../mcp/context.js";
import type { ChatTurn, SkillReadMetadata } from "../types/IChatTurn.js";
import type { AgentInteraction } from "../types/IAgent.js";
import type { ProposalItem } from "../types/A2UI/ITaskProposal.js";
import type { AgentActivity } from "../types/IAgentActivity.js";
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
import { uiPresentationService } from "./A2UI/uiPresentationService.js";
import { projectPersistedProposal } from "../utils/agentActivity.js";
import { projectRepository } from "../repositories/projectRepository.js";

export async function runConversationTurn(
  turn: ChatTurn,
  context: McpContext,
  selectedInteraction?: AgentInteraction,
) {
  const budget = createAgentBudget();
  let latestMessages = turn.messages;
  let latestActivities: AgentActivity[] = turn.activities ?? [];
  let latestSkillsRead: SkillReadMetadata[] = turn.skillsRead ?? [];
  try {
    if (selectedInteraction?.status === "cancelled") {
      const response = "";
      await repository.finish(
        turn._id,
        response,
        "completed",
        turn.executionToken,
        undefined,
        latestSkillsRead,
      );
      return resultFor({
        ...turn,
        activities: latestActivities,
        status: "completed",
        response,
        skillsRead: latestSkillsRead,
      });
    }
    const previous = await repository.turns(
      String(context.user._id),
      turn.conversationId,
      turn.sequence,
      20,
    );
    let projectContext: { id: string; name: string } | null = null;
    if (turn.contextProjectId) {
      const project = await projectRepository.findOwnedById(
        turn.contextProjectId,
        context.user._id,
      );
      if (project) {
        projectContext = {
          id: String(project._id),
          name: project.name,
        };
      }
    }
    const attachmentContext = await attachmentVisionService.context(
      String(context.user._id),
      turn.conversationId,
      turn.attachments ?? [],
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
        attachmentContext,
        mode: turn.mode ?? "auto",
        intent: turn.intent,
        projectContext,
        timeContext:
          turn.timeContext ??
          createAgentTimeContext(
            turn.createdAt ? new Date(turn.createdAt) : new Date(),
          ),
        history: prepareHistory(previous),
        approvedInteraction:
          selectedInteraction?.kind === "confirmation"
            ? selectedInteraction
            : undefined,
        checkpoint: async (messages, activities, skillsRead) => {
          latestMessages = [...messages];
          if (activities) {
            latestActivities = [...activities];
          }
          if (skillsRead) {
            latestSkillsRead = [...skillsRead];
          }
          await repository.checkpoint(
            turn._id,
            messages,
            turn.executionToken,
            activities,
            skillsRead,
          );
        },
        onSkillsRead: (skillsRead) => {
          latestSkillsRead = [...skillsRead];
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
          latestSkillsRead,
        );
        return resultFor({
          ...turn,
          activities: latestActivities,
          status: "completed",
          response: response.interaction.question,
          interactions: [...(turn.interactions ?? []), response.interaction],
          skillsRead: latestSkillsRead,
        });
      }
      if ("surfaceSpec" in response) {
        const storedSurface = uiPresentationService.toStoredUiSurface(
          response.surfaceSpec,
          "readonly",
        );
        await repository.finish(
          turn._id,
          response.surfaceSpec.fallbackText,
          "completed",
          turn.executionToken,
          undefined,
          latestSkillsRead,
          storedSurface,
        );
        const completedTurn: ChatTurn = {
          ...turn,
          activities: latestActivities,
          status: "completed",
          response: response.surfaceSpec.fallbackText,
          skillsRead: latestSkillsRead,
          uiSurface: storedSurface,
        };
        const envelope = uiPresentationService.forTurn(completedTurn);
        return resultFor(completedTurn, {
          surface: envelope.surface,
          text: envelope.text,
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
            undefined,
            latestSkillsRead,
          );
          return resultFor({
            ...turn,
            activities: latestActivities,
            status: "completed",
            response: guidance,
            skillsRead: latestSkillsRead,
          });
        }
        const storedSurface = response.presentation
          ? uiPresentationService.toStoredUiSurface(
              response.presentation,
              "proposal",
            )
          : undefined;
        const finalResponse =
          response.text ||
          "Tôi đã tạo đề xuất các công việc cho bạn. Vui lòng xem lại và xác nhận.";
        const proposal = await repository.finishWithProposal(
          turn._id,
          turn.executionToken,
          preparedItems,
          finalResponse,
          latestSkillsRead,
          storedSurface,
        );
        if (proposal)
          latestActivities = [
            ...latestActivities,
            ...projectPersistedProposal(proposal),
          ];
        const completedTurn: ChatTurn = {
          ...turn,
          activities: latestActivities,
          status: "completed",
          response: finalResponse,
          skillsRead: latestSkillsRead,
          ...(storedSurface ? { uiSurface: storedSurface } : {}),
        };
        const envelope = proposal
          ? uiPresentationService.forTurn(
              completedTurn,
              toProposalView(proposal),
            )
          : undefined;
        return resultFor(
          completedTurn,
          envelope
            ? {
                surface: envelope.surface,
                proposal: envelope.proposal,
                a2ui: envelope.a2ui,
              }
            : undefined,
        );
      }
    }
    await repository.finish(
      turn._id,
      response,
      "completed",
      turn.executionToken,
      undefined,
      latestSkillsRead,
    );
    return resultFor({
      ...turn,
      activities: latestActivities,
      status: "completed",
      response,
      skillsRead: latestSkillsRead,
    });
  } catch (error) {
    const response = interruptedReply(latestMessages);
    await repository.finish(
      turn._id,
      response,
      "failed",
      turn.executionToken,
      undefined,
      latestSkillsRead,
    );
    console.warn({
      event: "chat_turn_failed",
      requestId: context.requestId,
      code: error instanceof AppError ? error.code : "INTERNAL_ERROR",
    });
    return resultFor({
      ...turn,
      activities: latestActivities,
      status: "failed",
      response,
      skillsRead: latestSkillsRead,
    });
  }
}
