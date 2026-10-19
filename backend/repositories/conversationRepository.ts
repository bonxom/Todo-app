import mongoose from "mongoose";
import { createHash, randomUUID } from "node:crypto";
import Conversation from "../models/Conversation.js";
import ChatTurn from "../models/ChatTurn.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import { closePendingCalls, type AgentInteraction, type AgentMode } from "../services/agentInteraction.js";

export const INTERRUPTED_REPLY = "This response could not be completed. Some actions may already have succeeded. Check your tasks before requesting the action again.";
const turnId = (userId: string, requestId: string) => createHash("sha256").update(`${userId}:${requestId}`).digest("hex");
export interface InteractionAnswer { requestId: string; optionId?: string; customAnswer?: string }
const lease = () => new Date(Date.now() + 5 * 60_000);
const answerKey = (answer: { optionId?: string; customAnswer?: string } | undefined) =>
  JSON.stringify([answer?.optionId ?? null, answer?.customAnswer ?? null]);
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
  active: (userId: string, conversationId: string, id: string | null | undefined) =>
    id ? ChatTurn.findOne({ _id: id, userId, conversationId }).lean() : Promise.resolve(null),
  async claim(userId: string, conversationId: string, requestId: string, userInput: string, mode: AgentMode = "auto") {
    await ChatTurn.init();
    const id = turnId(userId, requestId);
    // Retry a duplicate-key race after the winning transaction commits.
    const attempt = () => mongoose.connection.transaction(async (session) => {
      const previous = await ChatTurn.findById(id).session(session);
      if (previous) {
        if (previous.conversationId !== conversationId || previous.userInput !== userInput || (previous.mode ?? "auto") !== mode) {
          throw new AppError(AI_ERROR.CHAT_REQUEST_CONFLICT);
        }
        return { turn: previous, claimed: false };
      }
      const expiresAt = lease();
      const conversation = await Conversation.findOneAndUpdate({
        _id: conversationId, userId,
        $or: [{ activeTurn: null }, { busyUntil: { $type: "date", $lt: new Date() } }],
      }, {
        $set: { activeTurn: id, busyUntil: expiresAt, mode, title: userInput.slice(0, 100) },
        $inc: { sequence: 1 },
      }, { new: true, session });
      if (!conversation) {
        const exists = await Conversation.exists({ _id: conversationId, userId }).session(session);
        throw new AppError(exists ? AI_ERROR.CONVERSATION_BUSY : AI_ERROR.CONVERSATION_NOT_FOUND);
      }
      const [turn] = await ChatTurn.create([{
        _id: id, userId, conversationId, requestId, userInput,
        sequence: conversation.sequence, expiresAt, mode, executionToken: randomUUID(),
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
  async checkpoint(id: string, messages: ChatCompletionMessageParam[], executionToken?: string) {
    const result = await ChatTurn.updateOne({ _id: id, status: "processing", expiresAt: { $gt: new Date() },
      ...(executionToken === undefined ? {} : { executionToken }),
    }, { $set: { messages } });
    if (!result.matchedCount) throw new AppError(AI_ERROR.PROVIDER_TIMEOUT);
  },
  // Called inside the business-write transaction. Writing the conversation fences
  // competing claims as well as transaction retries that outlive this worker.
  async guardExecution(id: string, executionToken: string) {
    const turn = await ChatTurn.findOne({ _id: id, status: "processing", executionToken, expiresAt: { $gt: new Date() } });
    if (!turn) throw new AppError(AI_ERROR.PROVIDER_TIMEOUT);
    const result = await Conversation.updateOne({
      _id: turn.conversationId, userId: turn.userId, activeTurn: id, busyUntil: { $gt: new Date() },
    }, { $inc: { executionRevision: 1 } });
    if (!result.matchedCount) throw new AppError(AI_ERROR.PROVIDER_TIMEOUT);
  },
  async pause(id: string, interaction: AgentInteraction, executionToken: string) {
    await mongoose.connection.transaction(async (session) => {
      const turn = await ChatTurn.findOneAndUpdate({ _id: id, status: "processing", executionToken, expiresAt: { $gt: new Date() } }, {
        $set: { status: "awaiting_user" }, $push: { interactions: interaction },
      }, { new: true, session });
      if (!turn) throw new AppError(AI_ERROR.PROVIDER_TIMEOUT);
      const locked = await Conversation.updateOne({ _id: turn.conversationId, activeTurn: id }, { $set: { busyUntil: null } }, { session });
      if (!locked.matchedCount) throw new AppError(AI_ERROR.INTERACTION_CONFLICT);
    });
  },
  async answer(userId: string, conversationId: string, interactionId: string, input: InteractionAnswer, cancel = false) {
    return mongoose.connection.transaction(async (session) => {
      const turn = await ChatTurn.findOne({ userId, conversationId, "interactions.id": interactionId }).session(session);
      if (!turn) throw new AppError(AI_ERROR.INTERACTION_NOT_FOUND);
      const interaction = turn.interactions.find((i) => i.id === interactionId)!;
      const answer = cancel ? { optionId: "cancel" } : {
        ...(input.optionId ? { optionId: input.optionId } : {}),
        ...(input.customAnswer ? { customAnswer: input.customAnswer } : {}),
      };
      if (interaction.status !== "pending") {
        if (interaction.answerRequestId !== input.requestId || answerKey(interaction.answer) !== answerKey(answer)
          || interaction.answerAction !== (cancel ? "cancel" : "answer")) {
          throw new AppError(AI_ERROR.INTERACTION_CONFLICT);
        }
        return { turn, interaction, claimed: false };
      }
      if (turn.status !== "awaiting_user" || turn.interactions.some((i) => i.answerRequestId === input.requestId)) {
        throw new AppError(AI_ERROR.INTERACTION_CONFLICT);
      }
      if (!cancel && (Boolean(input.optionId) === Boolean(input.customAnswer)
        || (input.optionId && !interaction.options.some((o) => o.id === input.optionId))
        || (input.customAnswer && (!interaction.allowCustomAnswer || interaction.kind !== "clarification")))) {
        throw new AppError(AI_ERROR.ANSWER_INVALID);
      }
      const cancelled = cancel || (interaction.kind === "confirmation" && input.optionId === "cancel");
      interaction.answer = answer;
      interaction.answerRequestId = input.requestId;
      interaction.answerAction = cancel ? "cancel" : "answer";
      interaction.status = cancelled ? "cancelled" : "answered";
      turn.markModified("interactions");
      turn.executionToken = randomUUID();
      turn.expiresAt = lease();
      turn.status = cancelled ? "cancelled" : "processing";
      if (cancelled) {
        turn.messages = closePendingCalls(turn.messages);
        turn.response = "Đã hủy lượt xử lý. Các thao tác đã hoàn tất trước đó vẫn được giữ lại.";
      } else if (interaction.kind === "clarification") {
        turn.messages.push({ role: "tool", tool_call_id: interaction.toolCallId, content: JSON.stringify(answer) });
      }
      turn.markModified("messages");
      const locked = await Conversation.updateOne({ _id: conversationId, userId, activeTurn: turn._id, busyUntil: null }, {
        $set: { activeTurn: cancelled ? null : turn._id, busyUntil: cancelled ? null : turn.expiresAt },
      }, { session });
      if (!locked.matchedCount) throw new AppError(AI_ERROR.INTERACTION_CONFLICT);
      await turn.save({ session });
      return { turn, interaction, claimed: !cancelled };
    });
  },
  async finish(id: string, response: string, status: "completed" | "failed", executionToken?: string) {
    // Commit final response and release the conversation together.
    await mongoose.connection.transaction(async (session) => {
      const result = await ChatTurn.updateOne({ _id: id, status: "processing", expiresAt: { $gt: new Date() },
        ...(executionToken === undefined ? {} : { executionToken }),
      }, { $set: { response, status } }, { session });
      if (!result.matchedCount) return;
      await Conversation.updateOne({ activeTurn: id }, { $set: { activeTurn: null, busyUntil: null } }, { session });
    });
  },
};
