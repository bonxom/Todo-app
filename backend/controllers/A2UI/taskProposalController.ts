import type { Request, Response } from "express";
import { taskProposalActionService } from "../../services/A2UI/taskProposalActionService.js";
import { taskProposalUiService } from "../../services/A2UI/taskProposalUiService.js";
import { isTaskProposalsEnabled } from "../../config/A2UI/a2ui.js";
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

  const envelope = taskProposalUiService.present(
    resultView,
    isTaskProposalsEnabled(),
  );

  res.status(200).json({
    success: true,
    data: envelope,
  });
};
