import Conversation from "../models/Conversation.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";

export const conversationRepository = {
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
};
