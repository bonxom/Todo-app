import type { Request, Response } from "express";
import { taskProposalActionService } from "../../services/A2UI/taskProposalActionService.js";
import { uiPresentationService } from "../../services/A2UI/uiPresentationService.js";
import type { ProposalAction } from "../../types/A2UI/ITaskProposal.js";
import { chatStreamRepository } from "../../repositories/chatStreamRepository.js";
import { chatRunService } from "../../services/chatRunService.js";
import { conversationService } from "../../services/conversationService.js";
import { createMcpContext } from "../../mcp/context.js";
import type { ChatTurn } from "../../types/IChatTurn.js";

export const handleProposalAction = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = String(req.user!._id);
  const conversationId = String(req.params.conversationId);
  const proposalId = String(req.params.proposalId);
  const action = req.validatedBody as ProposalAction;
  let continuation: { turn: ChatTurn; claimed: boolean } | undefined;

  const resultView = await taskProposalActionService.apply(
    userId,
    conversationId,
    proposalId,
    action,
    async (view, session) => {
      continuation = await conversationService.claimProposalContinuation(
        userId,
        view,
        action.requestId,
        session,
      );
    },
  );

  if (continuation?.claimed)
    chatRunService.start(
      continuation.turn,
      createMcpContext(req, ["tasks:write"]),
    );
  const [envelope, run] = await Promise.all([
    uiPresentationService.forProposal(userId, resultView),
    continuation
      ? chatStreamRepository.getSnapshot(
          userId,
          conversationId,
          continuation.turn._id,
        )
      : undefined,
  ]);

  res.status(200).json({
    success: true,
    data: { ...envelope, ...(run ? { continuation: run } : {}) },
  });
};
