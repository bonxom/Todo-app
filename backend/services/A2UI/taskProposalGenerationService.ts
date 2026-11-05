import { AppError } from "../../error/AppError.js";
import { TASK_PROPOSAL_ERROR } from "../../error/definitions/A2UI/taskProposalErrors.js";
import { CATEGORY_ERROR } from "../../error/definitions/categoryErrors.js";
import { randomUUID } from "node:crypto";
import type { McpContext } from "../../mcp/context.js";
import { categoryRepository } from "../../repositories/categoryRepository.js";
import { projectRepository } from "../../repositories/projectRepository.js";
import { proposalItemsSchema } from "../../validations/A2UI/taskProposalValidation.js";
import type {
  ITaskProposal,
  ProposalItem,
  ProposalView,
} from "../../types/A2UI/ITaskProposal.js";
import { normalizeTaskDateInput } from "../../utils/dateTime.js";

export function toProposalView(proposal: ITaskProposal): ProposalView {
  return {
    id: proposal.proposalId,
    conversationId: proposal.conversationId,
    turnId: proposal.turnId,
    revision: proposal.revision,
    status: proposal.status,
    protocolVersion: proposal.protocolVersion,
    catalogId: proposal.catalogId,
    items: proposal.items,
    selectedItemIds:
      proposal.selectedItemIds ?? proposal.items.map((i) => i.id),
    createdTasks: proposal.createdTasks ?? [],
  };
}

export const taskProposalGenerationService = {
  async prepare(
    rawItems: Omit<ProposalItem, "id">[],
    context: McpContext,
  ): Promise<ProposalItem[]> {
    // Validate original values before date normalization can roll calendar overflow.
    const parsed = proposalItemsSchema.parse(
      rawItems.map((item) => ({ ...item, id: randomUUID() })),
    );
    const userId = String(context.user._id);
    const categories = await categoryRepository.findByUser(userId);
    const uncategorized = categories.find(
      (category) => category.name === "Uncategorized",
    );
    const result: ProposalItem[] = [];
    for (const item of parsed) {
      if (
        item.categoryId &&
        !categories.some((category) => String(category._id) === item.categoryId)
      )
        throw new AppError(TASK_PROPOSAL_ERROR.INVALID_REFERENCE);
      if (!item.categoryId && !uncategorized)
        throw new AppError(CATEGORY_ERROR.DEFAULT_CATEGORY_UNAVAILABLE);
      if (item.projectId) {
        const project = await projectRepository.findById(item.projectId);
        if (
          !project ||
          String(project.userId) !== userId ||
          project.status === "completed"
        )
          throw new AppError(TASK_PROPOSAL_ERROR.INVALID_REFERENCE);
      }
      result.push({
        ...item,
        categoryId: item.categoryId ?? String(uncategorized!._id),
        projectId: item.projectId ?? null,
        startDate:
          normalizeTaskDateInput(item.startDate).value?.toISOString() ?? null,
        dueDate:
          normalizeTaskDateInput(item.dueDate).value?.toISOString() ?? null,
      });
    }
    return result;
  },
};
