import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { isTaskProposalsEnabled } from "../../config/A2UI/a2ui.js";
import { taskProposalRepository } from "../../repositories/A2UI/taskProposalRepository.js";
import { writeRepository } from "../../mcp/repositories/writeRepository.js";
import { taskService } from "../taskService.js";
import { categoryRepository } from "../../repositories/categoryRepository.js";
import { projectRepository } from "../../repositories/projectRepository.js";
import { toProposalView } from "./taskProposalGenerationService.js";
import { AppError } from "../../error/AppError.js";
import { TASK_PROPOSAL_ERROR } from "../../error/definitions/A2UI/taskProposalErrors.js";
import type {
  ProposalAction,
  ProposalCreatedTask,
  ProposalView,
} from "../../types/A2UI/ITaskProposal.js";

function canonical(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
      .join(",")}}`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  return JSON.stringify(value);
}

export function computeActionFingerprint(
  proposalId: string,
  conversationId: string,
  action: ProposalAction,
): string {
  const canonicalData = {
    proposalId,
    conversationId,
    revision: action.revision,
    action: action.action,
    ...(action.action !== "cancel"
      ? {
          items: action.items,
          selectedItemIds: [...action.selectedItemIds].sort(),
        }
      : {}),
  };
  return createHash("sha256").update(canonical(canonicalData)).digest("hex");
}

export const taskProposalActionService = {
  computeFingerprint: computeActionFingerprint,

  async apply(
    userId: string,
    conversationId: string,
    proposalId: string,
    action: ProposalAction,
  ): Promise<ProposalView> {
    if (!isTaskProposalsEnabled()) {
      throw new AppError(TASK_PROPOSAL_ERROR.DISABLED);
    }

    await taskProposalRepository.initIndexes();
    try {
      return await writeRepository.transaction(userId, async () => {
        // 1. Replay check via receipt
        const receipt = await taskProposalRepository.findReceipt(
          userId,
          action.requestId,
        );
        const fingerprint = computeActionFingerprint(
          proposalId,
          conversationId,
          action,
        );

        if (receipt) {
          if (receipt.payloadFingerprint === fingerprint) {
            return receipt.responseView;
          }
          throw new AppError(TASK_PROPOSAL_ERROR.REQUEST_CONFLICT);
        }

        // 2. Fetch and verify proposal ownership & state
        const proposal = await taskProposalRepository.findOwned(
          userId,
          conversationId,
          proposalId,
        );
        if (!proposal) {
          throw new AppError(TASK_PROPOSAL_ERROR.NOT_FOUND);
        }

        if (
          proposal.status !== "draft" ||
          proposal.revision !== action.revision
        ) {
          throw new AppError(TASK_PROPOSAL_ERROR.REVISION_CONFLICT);
        }

        // 3. Handle Cancel action
        if (action.action === "cancel") {
          const updated = await taskProposalRepository.saveRevision(
            userId,
            conversationId,
            proposalId,
            proposal.revision,
            { status: "cancelled" },
          );
          if (!updated) {
            throw new AppError(TASK_PROPOSAL_ERROR.REVISION_CONFLICT);
          }

          const responseView = toProposalView(updated);
          await taskProposalRepository.saveReceipt({
            userId: new mongoose.Types.ObjectId(userId),
            requestId: action.requestId,
            proposalId,
            payloadFingerprint: fingerprint,
            responseView,
          });

          return responseView;
        }

        // 4. Handle Save or Confirm action
        // Must contain exactly the stored item ID set
        const storedItemIds = new Set(proposal.items.map((i) => i.id));
        if (
          action.items.length !== proposal.items.length ||
          action.items.some((i) => !storedItemIds.has(i.id))
        ) {
          throw new AppError(TASK_PROPOSAL_ERROR.INVALID_REFERENCE);
        }

        // Validate references in items
        const userCategories = await categoryRepository.findByUser(userId);
        const userCategoryIds = new Set(
          userCategories.map((c) => String(c._id)),
        );

        for (const item of action.items) {
          if (
            item.categoryId &&
            !userCategoryIds.has(String(item.categoryId))
          ) {
            throw new AppError(TASK_PROPOSAL_ERROR.INVALID_REFERENCE);
          }
          if (item.projectId) {
            const project = await projectRepository.findById(item.projectId);
            if (
              !project ||
              String(project.userId) !== userId ||
              project.status === "completed"
            ) {
              throw new AppError(TASK_PROPOSAL_ERROR.INVALID_REFERENCE);
            }
          }
        }

        if (action.action === "save") {
          const updated = await taskProposalRepository.saveRevision(
            userId,
            conversationId,
            proposalId,
            proposal.revision,
            {
              items: action.items,
              selectedItemIds: action.selectedItemIds,
            },
          );
          if (!updated) {
            throw new AppError(TASK_PROPOSAL_ERROR.REVISION_CONFLICT);
          }

          const responseView = toProposalView(updated);
          await taskProposalRepository.saveReceipt({
            userId: new mongoose.Types.ObjectId(userId),
            requestId: action.requestId,
            proposalId,
            payloadFingerprint: fingerprint,
            responseView,
          });

          return responseView;
        }

        // Action is "confirm"
        const selectedSet = new Set(action.selectedItemIds);
        const selectedItems = action.items.filter((i) => selectedSet.has(i.id));
        if (selectedItems.length === 0) {
          throw new AppError(TASK_PROPOSAL_ERROR.INVALID_REFERENCE);
        }

        const createdTasks: ProposalCreatedTask[] = [];
        for (const item of selectedItems) {
          const { id: itemId, ...fields } = item;
          const task = await taskService.create(
            fields as Record<string, unknown>,
            userId,
          );
          if (!task) {
            throw new AppError(TASK_PROPOSAL_ERROR.CREATE_FAILED);
          }
          createdTasks.push({
            itemId,
            taskId: String(task._id),
            title: item.title,
          });
        }

        const updated = await taskProposalRepository.saveRevision(
          userId,
          conversationId,
          proposalId,
          proposal.revision,
          {
            status: "created",
            items: action.items,
            selectedItemIds: action.selectedItemIds,
            createdTasks,
          },
        );
        if (!updated) {
          throw new AppError(TASK_PROPOSAL_ERROR.REVISION_CONFLICT);
        }

        const responseView = toProposalView(updated);
        await taskProposalRepository.saveReceipt({
          userId: new mongoose.Types.ObjectId(userId),
          requestId: action.requestId,
          proposalId,
          payloadFingerprint: fingerprint,
          responseView,
        });

        return responseView;
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes(
          "Transaction numbers are only allowed on a replica set",
        ) ||
          error.message.includes("transactions are not supported"))
      ) {
        throw new AppError(TASK_PROPOSAL_ERROR.TRANSACTION_UNAVAILABLE);
      }
      throw error;
    }
  },
};
