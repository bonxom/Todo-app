import { TASK_PROPOSAL_ERROR } from "../error/definitions/A2UI/taskProposalErrors.js";
import { attachmentService } from "./attachmentService.js";
import type { McpContext } from "../mcp/context.js";
import type { AgentMode } from "../types/IAgent.js";
import type { InteractionSelection } from "../types/IChatTurn.js";
import type { ClientSession } from "mongoose";
import type {
  ProposalIntent,
  ProposalView,
} from "../types/A2UI/ITaskProposal.js";
import { conversationRepository as repository } from "../repositories/conversationRepository.js";
import { chatTurnRepository } from "../repositories/chatTurnRepository.js";
import { taskProposalRepository } from "../repositories/A2UI/taskProposalRepository.js";
import { toProposalView } from "./A2UI/taskProposalGenerationService.js";
import { uiPresentationService } from "./A2UI/uiPresentationService.js";
import { isTaskProposalsEnabled } from "../config/A2UI/a2ui.js";
import {
  deduplicateActivities,
  projectPersistedProposal,
} from "../utils/agentActivity.js";
import type { AgentActivity } from "../types/IAgentActivity.js";
import { projectRepository } from "../repositories/projectRepository.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";
import {
  publicInteraction,
  resultFor,
  turnMessages,
} from "../utils/conversationView.js";
import { runConversationTurn } from "./conversationTurnService.js";
import { prepareInteractionSelection } from "./interactionAnswerService.js";
import { chatRunService } from "./chatRunService.js";
import { chatStreamRepository } from "../repositories/chatStreamRepository.js";
import type { TurnSnapshot } from "../types/IChatStream.js";
import type { ChatTurn } from "../types/IChatTurn.js";
import { requireOwnedProject } from "./conversationContextService.js";
import { findProposalToolCall } from "../utils/agentMessages.js";

export const conversationService = {
  list: (userId: string) => repository.list(userId),
  async create(userId: string, id: string, projectId?: string) {
    if (projectId) await requireOwnedProject(userId, projectId);
    return repository.create(userId, id, projectId);
  },
  async get(userId: string, id?: string, before?: number) {
    const conversation = id
      ? await repository.get(userId, id)
      : await repository.latest(userId);
    if (!conversation) return null;
    const rows = await chatTurnRepository.turns(
      userId,
      conversation._id,
      before,
      51,
    );
    const hasMore = rows.length > 50;
    const visible = rows.slice(0, 50).reverse();
    const turnIds = visible.map((t) => t._id);
    const proposals = await taskProposalRepository.findByTurnIds(
      userId,
      turnIds,
    );
    const proposalsByTurn = new Map(proposals.map((p) => [p.turnId, p]));
    const activeTurn = await chatTurnRepository.active(
      userId,
      conversation._id,
      conversation.activeTurn,
    );
    const menuTurn = await chatTurnRepository.pendingMenu(
      userId,
      conversation._id,
    );
    const interaction = menuTurn?.interactions.find(
      (i) => i.status === "pending",
    );
    let contextResult: { projectId: string | null; available: boolean } = {
      projectId: null,
      available: true,
    };
    if (conversation.contextProjectId) {
      const project = await projectRepository.findOwnedById(
        conversation.contextProjectId,
        userId,
      );
      if (project) {
        contextResult = {
          projectId: String(project._id),
          available: true,
        };
      } else {
        contextResult = {
          projectId: null,
          available: false,
        };
      }
    }
    let activeRun: TurnSnapshot | null = null;
    if (
      activeTurn &&
      (activeTurn.status === "processing" || activeTurn.status === "stopping")
    ) {
      try {
        activeRun = await chatStreamRepository.getSnapshot(
          userId,
          conversation._id,
          activeTurn._id,
        );
      } catch {
        activeRun = null;
      }
    }

    return {
      capabilities: { taskProposals: isTaskProposalsEnabled() },
      conversationId: conversation._id,
      title: conversation.title,
      mode: conversation.mode ?? "auto",
      context: contextResult,
      activeRun,
      activities: deduplicateActivities(
        visible.flatMap((turn) => [
          ...((turn.activities as AgentActivity[]) ?? []),
          ...(proposalsByTurn.has(turn._id)
            ? projectPersistedProposal(proposalsByTurn.get(turn._id)!)
            : []),
        ]),
      ),
      ...(interaction ? { interaction: publicInteraction(interaction) } : {}),
      before: hasMore ? visible[0].sequence : null,
      messages: visible.flatMap((turn) => {
        const proposal = proposalsByTurn.get(turn._id);
        const envelope =
          proposal || turn.uiSurface
            ? uiPresentationService.forTurn(
                turn,
                proposal ? toProposalView(proposal) : undefined,
              )
            : undefined;
        return turnMessages(
          turn,
          envelope
            ? {
                surface: envelope.surface,
                proposal: envelope.proposal,
                a2ui: envelope.a2ui,
                text: envelope.text,
                companionText: envelope.companionText,
              }
            : undefined,
        );
      }),
      pending:
        activeTurn?.status === "processing" &&
        !activeTurn.proposalResolution &&
        activeTurn.expiresAt.getTime() > Date.now()
          ? [
              {
                requestId: activeTurn.requestId,
                userInput: activeTurn.userInput,
                mode: activeTurn.mode ?? "auto",
                intent:
                  activeTurn.requestIntent === undefined
                    ? activeTurn.intent
                    : (activeTurn.requestIntent ?? undefined),
                attachmentIds: (activeTurn.attachments ?? []).map(
                  (file) => file.id,
                ),
                ...(activeTurn.selection
                  ? { selection: activeTurn.selection }
                  : {}),
              },
            ]
          : [],
    };
  },
  async claimTurn(
    input: {
      conversationId: string;
      requestId: string;
      userInput: string;
      mode?: AgentMode;
      intent?: ProposalIntent;
      selection?: InteractionSelection;
      attachmentIds?: string[];
      timeZone?: string;
    },
    context: McpContext,
  ) {
    if (input.intent === "task_proposal" && !isTaskProposalsEnabled())
      throw new AppError(TASK_PROPOSAL_ERROR.DISABLED);
    const userId = String(context.user._id);
    return chatTurnRepository.claim(
      userId,
      input.conversationId,
      input.requestId,
      input.userInput,
      input.mode ?? "auto",
      input.intent,
      input.selection,
      (pending) =>
        prepareInteractionSelection(
          pending,
          input.selection,
          input.requestId,
          input.mode ?? "auto",
        ),
      input.attachmentIds ?? [],
      (session) =>
        attachmentService.bind(
          userId,
          input.conversationId,
          input.attachmentIds ?? [],
          session,
        ),
      input.timeZone,
    );
  },

  async claimProposalContinuation(
    userId: string,
    view: ProposalView,
    actionRequestId: string,
    session: ClientSession,
  ) {
    if (view.status === "draft") return;
    const source = await chatTurnRepository.active(
      userId,
      view.conversationId,
      view.turnId,
    );
    const toolCallId = source && findProposalToolCall(source.messages);
    if (!source || !toolCallId) return;
    const { turn, claimed } = await chatTurnRepository.claim(
      userId,
      view.conversationId,
      `proposal:${actionRequestId}`,
      source.userInput,
      source.mode,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      source.timeContext?.timeZone,
      {
        session,
        resolution: {
          proposalId: view.id,
          sourceTurnId: view.turnId,
          toolCallId,
          status: view.status,
          createdTasks: view.createdTasks,
        },
      },
    );
    return { turn: turn.toObject(), claimed };
  },

  async startStreamTurn(
    input: {
      conversationId: string;
      requestId: string;
      userInput: string;
      mode?: AgentMode;
      intent?: ProposalIntent;
      selection?: InteractionSelection;
      attachmentIds?: string[];
      timeZone?: string;
    },
    context: McpContext,
  ): Promise<{ snapshot: TurnSnapshot; isNew: boolean }> {
    const { turn, claimed, selectedInteraction } = await this.claimTurn(
      input,
      context,
    );
    const turnObject =
      turn && typeof turn === "object" && "toObject" in turn
        ? (turn as { toObject(): ChatTurn }).toObject()
        : (turn as ChatTurn);
    if (claimed) {
      chatRunService.start(
        turnObject,
        context,
        input.selection ? selectedInteraction : undefined,
      );
      const snapshot = await chatStreamRepository.getSnapshot(
        String(context.user._id),
        input.conversationId,
        turnObject._id,
      );
      return { snapshot, isNew: true };
    }
    const snapshot = await chatStreamRepository.getSnapshot(
      String(context.user._id),
      input.conversationId,
      turnObject._id,
    );
    return { snapshot, isNew: false };
  },

  async send(
    input: {
      conversationId: string;
      requestId: string;
      userInput: string;
      mode?: AgentMode;
      intent?: ProposalIntent;
      selection?: InteractionSelection;
      attachmentIds?: string[];
      timeZone?: string;
    },
    context: McpContext,
  ) {
    const userId = String(context.user._id);
    const { turn, claimed, selectedInteraction } = await this.claimTurn(
      input,
      context,
    );
    if (!claimed) {
      if (turn.status === "processing" && turn.expiresAt.getTime() > Date.now())
        throw new AppError(AI_ERROR.CONVERSATION_BUSY);
      const proposal = await taskProposalRepository.findByTurn(
        userId,
        turn._id,
      );
      const turnObject = turn.toObject();
      const envelope =
        proposal || turnObject.uiSurface
          ? uiPresentationService.forTurn(
              turnObject,
              proposal ? toProposalView(proposal) : undefined,
            )
          : undefined;
      return resultFor(
        {
          ...turnObject,
          activities: deduplicateActivities([
            ...((turn.activities as AgentActivity[]) ?? []),
            ...(proposal ? projectPersistedProposal(proposal) : []),
          ]),
        },
        envelope
          ? {
              surface: envelope.surface,
              proposal: envelope.proposal,
              a2ui: envelope.a2ui,
              text: envelope.text,
            }
          : undefined,
      );
    }
    return runConversationTurn(
      turn.toObject(),
      context,
      input.selection ? selectedInteraction : undefined,
    );
  },
};
