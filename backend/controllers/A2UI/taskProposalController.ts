import type { Request, Response } from "express";
import { taskProposalActionService } from "../../services/A2UI/taskProposalActionService.js";
import { uiPresentationService } from "../../services/A2UI/uiPresentationService.js";
import type { ProposalAction } from "../../types/A2UI/ITaskProposal.js";

export const handleProposalAction = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = String(req.user!._id);
  const conversationId = String(req.params.conversationId);
  const proposalId = String(req.params.proposalId);
  const action = req.validatedBody as ProposalAction;

  const resultView = await taskProposalActionService.apply(
    userId,
    conversationId,
    proposalId,
    action,
  );

  const envelope = await uiPresentationService.forProposal(userId, resultView);

  res.status(200).json({
    success: true,
    data: envelope,
  });
};
