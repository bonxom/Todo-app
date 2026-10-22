import type { McpContext } from "../mcp/context.js";
import type { AgentMode } from "../types/IAgent.js";
import type { InteractionSelection } from "../types/IChatTurn.js";
import { conversationRepository as repository } from "../repositories/conversationRepository.js";
import { chatTurnRepository } from "../repositories/chatTurnRepository.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";
import {
  publicInteraction,
  resultFor,
  turnMessages,
} from "../utils/conversationView.js";
import { runConversationTurn } from "./conversationTurnService.js";
import { prepareInteractionSelection } from "./interactionAnswerService.js";

export const conversationService = {
  list: (userId: string) => repository.list(userId),
  create: (userId: string, id: string) => repository.create(userId, id),
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
    return {
      conversationId: conversation._id,
      title: conversation.title,
      mode: conversation.mode ?? "auto",
      ...(interaction ? { interaction: publicInteraction(interaction) } : {}),
      before: hasMore ? visible[0].sequence : null,
      messages: visible.flatMap(turnMessages),
      pending:
        activeTurn?.status === "processing" &&
        activeTurn.expiresAt.getTime() > Date.now()
          ? [
              {
                requestId: activeTurn.requestId,
                userInput: activeTurn.userInput,
                mode: activeTurn.mode ?? "auto",
                ...(activeTurn.selection
                  ? { selection: activeTurn.selection }
                  : {}),
              },
            ]
          : [],
    };
  },
  async send(
    input: {
      conversationId: string;
      requestId: string;
      userInput: string;
      mode?: AgentMode;
      selection?: InteractionSelection;
    },
    context: McpContext,
  ) {
    const userId = String(context.user._id);
    const { turn, claimed, selectedInteraction } =
      await chatTurnRepository.claim(
        userId,
        input.conversationId,
        input.requestId,
        input.userInput,
        input.mode ?? "auto",
        input.selection,
        (pending) =>
          prepareInteractionSelection(
            pending,
            input.selection,
            input.requestId,
            input.mode ?? "auto",
          ),
      );
    if (!claimed) {
      if (turn.status === "processing" && turn.expiresAt.getTime() > Date.now())
        throw new AppError(AI_ERROR.CONVERSATION_BUSY);
      return resultFor(turn);
    }
    return runConversationTurn(
      turn.toObject(),
      context,
      input.selection ? selectedInteraction : undefined,
    );
  },
};
