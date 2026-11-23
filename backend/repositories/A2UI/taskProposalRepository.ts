import mongoose, { type ClientSession } from "mongoose";
import TaskProposal from "../../models/A2UI/TaskProposal.js";
import TaskProposalReceipt from "../../models/A2UI/TaskProposalReceipt.js";
import type {
  ITaskProposal,
  ITaskProposalReceipt,
} from "../../types/A2UI/ITaskProposal.js";
import type {
  CancelledProposalContext,
  ConfirmedProposalContext,
} from "../../types/IAgent.js";

export const taskProposalRepository = {
  async initIndexes(): Promise<void> {
    await TaskProposal.init();
    await TaskProposalReceipt.init();
  },

  async findRecentConfirmed(
    userId: string,
    conversationId: string,
    session?: ClientSession,
  ): Promise<ConfirmedProposalContext[]> {
    if (
      mongoose.connection.readyState === 0 ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return [];
    }
    const query = TaskProposal.find({
      userId,
      conversationId,
      status: "created",
      "createdTasks.0": { $exists: true },
    })
      .sort({ updatedAt: -1, _id: -1 })
      .limit(3)
      .select({
        proposalId: 1,
        updatedAt: 1,
        createdAt: 1,
        createdTasks: 1,
      });
    if (session) query.session(session);
    const docs = await query.lean();
    return docs.map((doc) => {
      const confirmedDate = doc.updatedAt ?? doc.createdAt ?? new Date(0);
      const confirmedAt =
        confirmedDate instanceof Date
          ? confirmedDate.toISOString()
          : new Date(confirmedDate).toISOString();
      return {
        proposalId: doc.proposalId,
        confirmedAt,
        createdTasks: Array.isArray(doc.createdTasks)
          ? doc.createdTasks.map((t: { taskId?: string; title?: string }) => ({
              taskId: String(t.taskId ?? ""),
              title: String(t.title ?? ""),
            }))
          : [],
      };
    });
  },

  async findRecentCancelled(
    userId: string,
    conversationId: string,
  ): Promise<CancelledProposalContext[]> {
    if (
      mongoose.connection.readyState === 0 ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return [];
    }
    const proposals = await TaskProposal.find({
      userId,
      conversationId,
      status: "cancelled",
    })
      .sort({ updatedAt: -1, _id: -1 })
      .limit(3)
      .select({ proposalId: 1, updatedAt: 1 })
      .lean();
    return proposals.map((proposal) => ({
      proposalId: proposal.proposalId,
      cancelledAt: proposal.updatedAt?.toISOString(),
    }));
  },

  async findOwned(
    userId: string,
    conversationId: string,
    proposalId: string,
    session?: ClientSession,
  ): Promise<ITaskProposal | null> {
    const query = TaskProposal.findOne({
      userId,
      conversationId,
      proposalId,
    });
    if (session) query.session(session);
    return query.lean();
  },

  async findByTurn(
    userId: string,
    turnId: string,
    session?: ClientSession,
  ): Promise<ITaskProposal | null> {
    const query = TaskProposal.findOne({ userId, turnId });
    if (session) query.session(session);
    return query.lean();
  },

  async findByTurnIds(
    userId: string,
    turnIds: string[],
    session?: ClientSession,
  ): Promise<ITaskProposal[]> {
    if (turnIds.length === 0) return [];
    const query = TaskProposal.find({ userId, turnId: { $in: turnIds } });
    if (session) query.session(session);
    return query.lean();
  },

  async create(
    proposal: Partial<ITaskProposal>,
    session?: ClientSession,
  ): Promise<ITaskProposal> {
    if (session) {
      const [created] = await TaskProposal.create([proposal], { session });
      return created.toObject();
    }
    const created = await TaskProposal.create(proposal);
    return created.toObject();
  },

  async saveRevision(
    userId: string,
    conversationId: string,
    proposalId: string,
    revision: number,
    update: Partial<ITaskProposal>,
    session?: ClientSession,
  ): Promise<ITaskProposal | null> {
    const query = TaskProposal.findOneAndUpdate(
      { userId, conversationId, proposalId, revision },
      { ...update, revision: revision + 1 },
      { new: true },
    );
    if (session) query.session(session);
    return query.lean();
  },

  async findReceipt(
    userId: string,
    requestId: string,
    session?: ClientSession,
  ): Promise<ITaskProposalReceipt | null> {
    const query = TaskProposalReceipt.findOne({ userId, requestId });
    if (session) query.session(session);
    return query.lean();
  },

  async saveReceipt(
    receipt: Partial<ITaskProposalReceipt>,
    session?: ClientSession,
  ): Promise<ITaskProposalReceipt> {
    if (session) {
      const [created] = await TaskProposalReceipt.create([receipt], {
        session,
      });
      return created.toObject();
    }
    const created = await TaskProposalReceipt.create(receipt);
    return created.toObject();
  },
};
