import type { ClientSession } from "mongoose";
import TaskProposal from "../../models/A2UI/TaskProposal.js";
import TaskProposalReceipt from "../../models/A2UI/TaskProposalReceipt.js";
import type {
  ITaskProposal,
  ITaskProposalReceipt,
} from "../../types/A2UI/ITaskProposal.js";

export const taskProposalRepository = {
  async initIndexes(): Promise<void> {
    await TaskProposal.init();
    await TaskProposalReceipt.init();
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
