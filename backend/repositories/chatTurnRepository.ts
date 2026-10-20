import mongoose from "mongoose";
import { createHash, randomUUID } from "node:crypto";
import Conversation from "../models/Conversation.js";
import ChatTurn from "../models/ChatTurn.js";
import type { InteractionSelection } from "../types/IChatTurn.js";
import type { AgentInteraction, AgentMode } from "../types/IAgent.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import { AppError } from "../error/AppError.js";
import { completeMenuMessages } from "../utils/agentMessages.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";

const turnId = (userId: string, requestId: string) =>
  createHash("sha256").update(`${userId}:${requestId}`).digest("hex");
const lease = () => new Date(Date.now() + 5 * 60_000);

const selectionKey = (s?: InteractionSelection) =>
  JSON.stringify([
    s?.interactionId ?? null,
    s?.optionId ?? null,
    s?.customAnswer ?? null,
    s?.cancel ?? false,
  ]);
const pendingMenuQuery = (userId: string, conversationId: string) =>
  ChatTurn.findOne({
    userId,
    conversationId,
    status: { $in: ["completed", "awaiting_user"] },
    "interactions.status": "pending",
  }).sort({ sequence: -1 });

export const chatTurnRepository = {
  pendingMenu: (userId: string, conversationId: string) =>
    pendingMenuQuery(userId, conversationId).lean(),
  turns: (
    userId: string,
    conversationId: string,
    before = Number.MAX_SAFE_INTEGER,
    limit = 50,
  ) =>
    ChatTurn.find({ userId, conversationId, sequence: { $lt: before } })
      .sort({ sequence: -1 })
      .limit(limit)
      .lean(),
  active: (
    userId: string,
    conversationId: string,
    id: string | null | undefined,
  ) =>
    id
      ? ChatTurn.findOne({ _id: id, userId, conversationId }).lean()
      : Promise.resolve(null),
  async claim(
    userId: string,
    conversationId: string,
    requestId: string,
    userInput: string,
    mode: AgentMode = "auto",
    selection?: InteractionSelection,
    resolveSelection: (
      pending?: AgentInteraction,
    ) => AgentInteraction | undefined = () => undefined,
  ) {
    await ChatTurn.init();
    const id = turnId(userId, requestId);
    // Retry a duplicate-key race after the winning transaction commits.
    const attempt = () =>
      mongoose.connection.transaction(async (session) => {
        const previous = await ChatTurn.findById(id).session(session);
        if (previous) {
          if (
            previous.conversationId !== conversationId ||
            previous.userInput !== userInput ||
            (previous.mode ?? "auto") !== mode ||
            selectionKey(previous.selection) !== selectionKey(selection)
          ) {
            throw new AppError(AI_ERROR.CHAT_REQUEST_CONFLICT);
          }
          return { turn: previous, claimed: false };
        }
        const pendingTurn = await pendingMenuQuery(
          userId,
          conversationId,
        ).session(session);
        // Compatibility for menus saved by the previous pause/resume implementation.
        if (pendingTurn?.status === "awaiting_user") {
          await Conversation.updateOne(
            {
              _id: conversationId,
              userId,
              activeTurn: pendingTurn._id,
              busyUntil: null,
            },
            { $set: { activeTurn: null, busyUntil: null } },
            { session },
          );
        }
        const expiresAt = lease();
        const conversation = await Conversation.findOneAndUpdate(
          {
            _id: conversationId,
            userId,
            $or: [
              { activeTurn: null },
              { busyUntil: { $type: "date", $lt: new Date() } },
            ],
          },
          {
            $set: {
              activeTurn: id,
              busyUntil: expiresAt,
              mode,
              title: userInput.slice(0, 100),
            },
            $inc: { sequence: 1 },
          },
          { new: true, session },
        );
        if (!conversation) {
          const exists = await Conversation.exists({
            _id: conversationId,
            userId,
          }).session(session);
          throw new AppError(
            exists
              ? AI_ERROR.CONVERSATION_BUSY
              : AI_ERROR.CONVERSATION_NOT_FOUND,
          );
        }
        const pendingInteraction = pendingTurn?.interactions.find(
          (i) => i.status === "pending",
        );
        const selectedInteraction = resolveSelection(pendingInteraction);
        if (pendingTurn && selectedInteraction) {
          pendingTurn.interactions = pendingTurn.interactions.map((item) =>
            item.id === selectedInteraction.id ? selectedInteraction : item,
          );
          if (pendingTurn.status === "awaiting_user") {
            pendingTurn.messages = completeMenuMessages(
              pendingTurn.messages,
              selectedInteraction,
            );
            pendingTurn.response = selectedInteraction.question;
            pendingTurn.status = "completed";
          }
          pendingTurn.markModified("interactions");
          await pendingTurn.save({ session });
        }
        const [turn] = await ChatTurn.create(
          [
            {
              _id: id,
              userId,
              conversationId,
              requestId,
              userInput,
              selection,
              sequence: conversation.sequence,
              expiresAt,
              mode,
              executionToken: randomUUID(),
              messages: [{ role: "user", content: userInput }],
            },
          ],
          { session },
        );
        return { turn, claimed: true, selectedInteraction };
      });
    try {
      return await attempt();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return attempt();
      throw error;
    }
  },
  async checkpoint(
    id: string,
    messages: ChatCompletionMessageParam[],
    executionToken?: string,
  ) {
    const result = await ChatTurn.updateOne(
      {
        _id: id,
        status: "processing",
        expiresAt: { $gt: new Date() },
        ...(executionToken === undefined ? {} : { executionToken }),
      },
      { $set: { messages } },
    );
    if (!result.matchedCount) throw new AppError(AI_ERROR.PROVIDER_TIMEOUT);
  },
  // Called inside the business-write transaction. Writing the conversation fences
  // competing claims as well as transaction retries that outlive this worker.
  async guardExecution(id: string, executionToken: string) {
    const turn = await ChatTurn.findOne({
      _id: id,
      status: "processing",
      executionToken,
      expiresAt: { $gt: new Date() },
    });
    if (!turn) throw new AppError(AI_ERROR.PROVIDER_TIMEOUT);
    const result = await Conversation.updateOne(
      {
        _id: turn.conversationId,
        userId: turn.userId,
        activeTurn: id,
        busyUntil: { $gt: new Date() },
      },
      { $inc: { executionRevision: 1 } },
    );
    if (!result.matchedCount) throw new AppError(AI_ERROR.PROVIDER_TIMEOUT);
  },
  async finish(
    id: string,
    response: string,
    status: "completed" | "failed",
    executionToken?: string,
    interaction?: AgentInteraction,
  ) {
    // Commit final response and release the conversation together.
    await mongoose.connection.transaction(async (session) => {
      const result = await ChatTurn.updateOne(
        {
          _id: id,
          status: "processing",
          expiresAt: { $gt: new Date() },
          ...(executionToken === undefined ? {} : { executionToken }),
        },
        {
          $set: { response, status },
          ...(interaction ? { $push: { interactions: interaction } } : {}),
        },
        { session },
      );
      if (!result.matchedCount) return;
      await Conversation.updateOne(
        { activeTurn: id },
        { $set: { activeTurn: null, busyUntil: null } },
        { session },
      );
    });
  },
};
