import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";

export const conversationRepository = {
  list: (userId: string) =>
    Conversation.find({ userId, sequence: { $gt: 0 } })
      .select("_id title updatedAt")
      .sort({ updatedAt: -1, _id: -1 })
      .lean(),
  async create(userId: string, conversationId: string) {
    try {
      return await Conversation.create({ _id: conversationId, userId });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      return this.get(userId, conversationId);
    }
  },
  async get(userId: string, conversationId: string) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId,
    });
    if (!conversation) throw new AppError(AI_ERROR.CONVERSATION_NOT_FOUND);
    return conversation;
  },
  latest: (userId: string) =>
    Conversation.findOne({ userId }).sort({ updatedAt: -1, _id: -1 }),
  async updateContext(
    userId: string,
    conversationId: string,
    projectId: string | null,
  ) {
    const updated = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        userId,
        $or: [{ busyUntil: null }, { busyUntil: { $lte: new Date() } }],
      },
      {
        $set: {
          contextProjectId: projectId
            ? new mongoose.Types.ObjectId(projectId)
            : null,
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      const exists = await Conversation.findById(conversationId)
        .select("userId busyUntil")
        .lean();
      if (!exists || String(exists.userId) !== String(userId)) {
        throw new AppError(AI_ERROR.CONVERSATION_NOT_FOUND);
      }
      throw new AppError(AI_ERROR.CONVERSATION_BUSY);
    }

    return updated;
  },
};
