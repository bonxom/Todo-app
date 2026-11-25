import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";

export const DEFAULT_CONVERSATION_PAGE_SIZE = 20;

export interface ConversationCursor {
  updatedAt: Date;
  id: string;
}

export interface ConversationListOptions {
  cursor?: ConversationCursor;
  limit?: number;
  search?: string;
}

export function encodeConversationCursor(updatedAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ u: updatedAt.toISOString(), i: id }),
    "utf8",
  ).toString("base64url");
}

export function decodeConversationCursor(cursor: string): ConversationCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as { u?: unknown; i?: unknown };
    if (
      !parsed ||
      typeof parsed.u !== "string" ||
      typeof parsed.i !== "string" ||
      !parsed.i.trim()
    ) {
      throw new Error("Invalid cursor shape");
    }
    const updatedAt = new Date(parsed.u);
    if (Number.isNaN(updatedAt.getTime())) {
      throw new Error("Invalid cursor date");
    }
    return { updatedAt, id: parsed.i };
  } catch {
    throw new AppError(AI_ERROR.CONVERSATION_CURSOR_INVALID);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const conversationRepository = {
  async list(userId: string, options: ConversationListOptions = {}) {
    const limit = Math.min(
      Math.max(options.limit ?? DEFAULT_CONVERSATION_PAGE_SIZE, 1),
      100,
    );
    const filter: Record<string, unknown> = {
      userId,
      sequence: { $gt: 0 },
    };
    const trimmedSearch = options.search?.trim();
    if (trimmedSearch) {
      filter.title = {
        $regex: escapeRegExp(trimmedSearch),
        $options: "i",
      };
    }
    if (options.cursor) {
      filter.$or = [
        { updatedAt: { $lt: options.cursor.updatedAt } },
        {
          updatedAt: options.cursor.updatedAt,
          _id: { $lt: options.cursor.id },
        },
      ];
    }

    const rows = await Conversation.find(filter)
      .select("_id title updatedAt contextProjectId")
      .sort({ updatedAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem?.updatedAt
        ? encodeConversationCursor(
            new Date(lastItem.updatedAt),
            String(lastItem._id),
          )
        : null;

    return { items, nextCursor, hasMore };
  },
  async create(userId: string, conversationId: string, projectId?: string) {
    try {
      return await Conversation.create({
        _id: conversationId,
        userId,
        contextProjectId: projectId,
      });
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
