import { attachmentVisionService } from "./attachmentVisionService.js";
import { attachmentRepository } from "../repositories/attachmentRepository.js";
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
import { AI_ERROR } from "../error/definitions/aiErrors.js";
import { TASK_PROPOSAL_ERROR } from "../error/definitions/A2UI/taskProposalErrors.js";
import { prepareHistory, resolveProposalTool } from "../utils/agentMessages.js";
import { resultFor } from "../utils/conversationView.js";
import {
  taskProposalGenerationService,
  toProposalView,
} from "./A2UI/taskProposalGenerationService.js";
import { uiPresentationService } from "./A2UI/uiPresentationService.js";
import { uiActionService } from "./A2UI/uiActionService.js";
import { projectPersistedProposal } from "../utils/agentActivity.js";
import { taskProposalRepository } from "../repositories/A2UI/taskProposalRepository.js";
import {
  chatStreamRepository,
  toSnapshot,
} from "../repositories/chatStreamRepository.js";
import type { TurnOutcome } from "../types/IChatStream.js";
import { publicInteraction } from "../utils/conversationView.js";
import { projectRepository } from "../repositories/projectRepository.js";
import type { TurnExecution } from "./chatRunService.js";

export async function runConversationTurn(
  turn: ChatTurn,
  context: McpContext,
  selectedInteraction?: AgentInteraction,
  execution?: TurnExecution,
) {
  const totalBudgetMs = execution
    ? Math.max(0, execution.deadlineAt.getTime() - Date.now())
    : 50_000;
  const budget = createAgentBudget(() => performance.now(), totalBudgetMs);
  let latestMessages = turn.messages;
  let latestActivities: AgentActivity[] = turn.activities ?? [];
  let latestSkillsRead: SkillReadMetadata[] = turn.skillsRead ?? [];
  const finish = async (...args: Parameters<typeof repository.finish>) => {
    if (!execution) return repository.finish(...args);
    execution.signal.throwIfAborted();
    const [, response, status, , interaction, skillsRead, uiSurface] = args;
    const stored = {
      ...turn,
      response,
      uiSurface: uiSurface ?? turn.uiSurface,
    };
    const envelope = uiPresentationService.forTurn(stored);
    const outcome: TurnOutcome = {
      status,
      result: {
        turnId: turn._id,
        conversationId: turn.conversationId,
        status,
        response: interaction
          ? response
          : uiSurface
            ? envelope.text
            : undefined,
        ...(interaction ? { interaction: publicInteraction(interaction) } : {}),
        ...(envelope.surface ? { surface: envelope.surface } : {}),
        ...(envelope.actionBindings
          ? { actionBindings: envelope.actionBindings }
          : {}),
        ...(envelope.companionText
          ? { companionText: envelope.companionText }
          : {}),
        activities: latestActivities,
        skillsRead,
      },
      interaction,
      uiSurface,
    };
    // Text rounds are accumulated durably; a non-text result has its own canonical text.
    if (!interaction && !uiSurface) {
      const snapshot = await chatStreamRepository.getSnapshot(
        String(context.user._id),
        turn.conversationId,
        turn._id,
      );
      outcome.result.response = snapshot.partialResponse || response;
    }
    await chatStreamRepository.finish(turn._id, turn.executionToken, outcome);
  };
  try {
    execution?.signal.throwIfAborted();
    if (selectedInteraction?.status === "cancelled") {
      const response = "";
      await finish(
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
    const resolution = turn.proposalResolution;
    const source = resolution
      ? (previous.find((entry) => entry._id === resolution.sourceTurnId) ??
        (await repository.active(
          String(context.user._id),
          turn.conversationId,
          resolution.sourceTurnId,
        )))
      : undefined;
    const history =
      source && resolution
        ? prepareHistory(
            [
              {
                ...source,
                messages: resolveProposalTool(source.messages, resolution),
              },
              ...previous.filter((entry) => entry._id !== source._id),
            ],
            true,
          )
        : prepareHistory(previous);
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
    const hasImageAttachment = (files?: ChatTurn["attachments"]) =>
      (files ?? []).some((file) => file.mimeType.startsWith("image/"));
    const attachments = turn.attachments ?? [];
    const attachmentContext =
      attachmentVisionService.formatAttachmentMetadata(attachments);
    const hasConversationImages =
      hasImageAttachment(attachments) ||
      previous.some((prev) => hasImageAttachment(prev.attachments)) ||
      (previous.length >= 20 &&
        (await attachmentRepository.hasAttachedImage(
          String(context.user._id),
          turn.conversationId,
        )));
    const userId = String(context.user._id);
    const [confirmedProposals, cancelledProposals, uiActionOutcomes] =
      await Promise.all([
        taskProposalRepository.findRecentConfirmed(userId, turn.conversationId),
        taskProposalRepository.findRecentCancelled(userId, turn.conversationId),
        uiActionService.recentOutcomes(userId, turn.conversationId),
      ]);
    execution?.signal.throwIfAborted();
    const response = await agentService.chatWithMcp(
      turn.userInput,
      {
        ...context,
        beforeWrite: async () => {
          if (execution?.signal.aborted) {
            throw new AppError(AI_ERROR.PROVIDER_TIMEOUT);
          }
          await context.beforeWrite?.();
          if (turn.intent === "task_proposal") {
            throw new AppError(TASK_PROPOSAL_ERROR.WRITE_FORBIDDEN);
          }
          await repository.guardExecution(turn._id, turn.executionToken);
        },
      },
      {
        budget,
        conversationId: turn.conversationId,
        hasConversationImages,
        attachmentContext,
        turnId: turn._id,
        stream: execution
          ? {
              signal: execution.signal,
              emit: execution.emit,
            }
          : undefined,
        mode: turn.mode ?? "auto",
        intent: turn.intent,
        projectContext,
        timeContext:
          turn.timeContext ??
          createAgentTimeContext(
            turn.createdAt ? new Date(turn.createdAt) : new Date(),
          ),
        confirmedProposals,
        cancelledProposals,
        uiActionOutcomes,
        history,
        proposalResolution: resolution,
        answeredClarification:
          selectedInteraction?.kind === "clarification" &&
          selectedInteraction.status === "answered"
            ? selectedInteraction
            : undefined,
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
        await finish(
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
        const storedResponse =
          response.companionText || response.surfaceSpec.fallbackText;
        await finish(
          turn._id,
          storedResponse,
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
          response: storedResponse,
          skillsRead: latestSkillsRead,
          uiSurface: storedSurface,
        };
        const envelope = uiPresentationService.forTurn(completedTurn);
        return resultFor(completedTurn, {
          surface: envelope.surface,
          text: envelope.text,
          companionText: envelope.companionText,
        });
      }
      if ("interactiveSurface" in response) {
        const storedSurface = response.interactiveSurface;
        const storedResponse =
          response.companionText || storedSurface.spec.fallbackText;
        await finish(
          turn._id,
          storedResponse,
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
          response: storedResponse,
          skillsRead: latestSkillsRead,
          uiSurface: storedSurface,
        };
        const envelope = uiPresentationService.forTurn(completedTurn);
        return resultFor(completedTurn, {
          surface: envelope.surface,
          actionBindings: envelope.actionBindings,
          text: envelope.text,
          companionText: envelope.companionText,
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
          await finish(
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
          response.companionText ||
          response.text ||
          "Tôi đã tạo đề xuất các công việc cho bạn. Vui lòng xem lại và xác nhận.";
        const proposal = await repository.finishWithProposal(
          turn._id,
          turn.executionToken,
          preparedItems,
          finalResponse,
          latestSkillsRead,
          storedSurface,
          execution
            ? async (created, session) => {
                execution.signal.throwIfAborted();
                const activities = [
                  ...latestActivities,
                  ...projectPersistedProposal(created),
                ];
                const envelope = uiPresentationService.forTurn(
                  {
                    ...turn,
                    response: finalResponse,
                    uiSurface: storedSurface,
                  },
                  toProposalView(created),
                );
                const finalized = await chatStreamRepository.finishInSession(
                  turn._id,
                  turn.executionToken,
                  {
                    status: "completed",
                    proposalId: created.proposalId,
                    uiSurface: storedSurface,
                    result: {
                      ...resultFor(
                        {
                          ...turn,
                          status: "completed",
                          response: finalResponse,
                          activities,
                          skillsRead: latestSkillsRead,
                        },
                        envelope,
                      ),
                      response: envelope.text,
                      status: "completed",
                    },
                  },
                  session,
                );
                if (finalized.status !== "completed") {
                  // Roll back the draft as well as terminalization; the runner will
                  // persist the stopped outcome outside this transaction.
                  throw new Error(
                    finalized.status === "timed_out"
                      ? "deadline_exceeded"
                      : "user_cancelled",
                  );
                }
              }
            : undefined,
        );
        if (execution && !proposal)
          throw new AppError(AI_ERROR.PROVIDER_TIMEOUT);
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
        const finalResult = resultFor(
          completedTurn,
          envelope
            ? {
                surface: envelope.surface,
                proposal: envelope.proposal,
                a2ui: envelope.a2ui,
              }
            : undefined,
        );
        if (execution && proposal) {
          chatStreamRepository.postFinishNotification(
            turn._id,
            {
              status: "completed",
              result: { ...finalResult, status: "completed" },
            },
            toSnapshot(completedTurn),
          );
        }
        return finalResult;
      }
    }
    await finish(
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
    if (execution) throw error;
    const response = interruptedReply(latestMessages);
    await finish(
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
