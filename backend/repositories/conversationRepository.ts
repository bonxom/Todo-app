import mongoose from "mongoose";
import { createHash } from "node:crypto";
import Conversation from "../models/Conversation.js";
import ChatTurn from "../models/ChatTurn.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

export const INTERRUPTED_REPLY = "This response could not be completed. Some actions may already have succeeded. Check your tasks before requesting the action again.";
const turnId = (userId: string, requestId: string) => createHash("sha256").update(`${userId}:${requestId}`).digest("hex");
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
    const conversation = await Conversation.findOne({ _id: conversationId, userId });
    if (!conversation) throw new AppError(AI_ERROR.CONVERSATION_NOT_FOUND);
    return conversation;
  },
  latest: (userId: string) => Conversation.findOne({ userId }).sort({ updatedAt: -1, _id: -1 }),
  turns: (userId: string, conversationId: string, before = Number.MAX_SAFE_INTEGER, limit = 50) =>
    ChatTurn.find({ userId, conversationId, sequence: { $lt: before } }).sort({ sequence: -1 }).limit(limit).lean(),
  async claim(userId: string, conversationId: string, requestId: string, userInput: string) {
    await ChatTurn.init();
    const id = turnId(userId, requestId);
    // Retry a duplicate-key race after the winning transaction commits.
    const attempt = () => mongoose.connection.transaction(async (session) => {
      const previous = await ChatTurn.findById(id).session(session);
      if (previous) {
        if (previous.conversationId !== conversationId || previous.userInput !== userInput) {
          throw new AppError(AI_ERROR.CHAT_REQUEST_CONFLICT);
        }
        return { turn: previous, claimed: false };
      }
      const expiresAt = new Date(Date.now() + 5 * 60_000);
      const conversation = await Conversation.findOneAndUpdate({
        _id: conversationId, userId,
        $or: [{ activeTurn: null }, { busyUntil: { $lt: new Date() } }],
      }, {
        $set: { activeTurn: id, busyUntil: expiresAt, title: userInput.slice(0, 100) },
        $inc: { sequence: 1 },
      }, { new: true, session });
      if (!conversation) {
        const exists = await Conversation.exists({ _id: conversationId, userId }).session(session);
        throw new AppError(exists ? AI_ERROR.CONVERSATION_BUSY : AI_ERROR.CONVERSATION_NOT_FOUND);
      }
      const [turn] = await ChatTurn.create([{
        _id: id, userId, conversationId, requestId, userInput,
        sequence: conversation.sequence, expiresAt,
        messages: [{ role: "user", content: userInput }],
      }], { session });
      return { turn, claimed: true };
    });
    try { return await attempt(); }
    catch (error) {
      if ((error as { code?: number }).code === 11000) return attempt();
      throw error;
    }
  },
  async checkpoint(id: string, messages: ChatCompletionMessageParam[]) {
    const result = await ChatTurn.updateOne({ _id: id, status: "processing", expiresAt: { $gt: new Date() } }, { $set: { messages } });
    if (!result.matchedCount) throw new AppError(AI_ERROR.PROVIDER_TIMEOUT);
  },
  async finish(id: string, response: string, status: "completed" | "failed") {
    // Commit final response and release the conversation together.
    await mongoose.connection.transaction(async (session) => {
      await ChatTurn.updateOne({ _id: id, status: "processing" }, { $set: { response, status } }, { session });
      await Conversation.updateOne({ activeTurn: id }, { $set: { activeTurn: null, busyUntil: null } }, { session });
    });
  },
};
