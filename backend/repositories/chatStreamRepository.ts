import mongoose from "mongoose";
import ChatTurn from "../models/ChatTurn.js";
import ChatTurnEvent from "../models/ChatTurnEvent.js";
import ChatRunSlot from "../models/ChatRunSlot.js";
import Conversation from "../models/Conversation.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";
import { deduplicateActivities } from "../utils/agentActivity.js";
import type {
  ChatEventInput,
  ChatStreamEvent,
  PublicChatResult,
  TurnOutcome,
  TurnSnapshot,
} from "../types/IChatStream.js";
import type { ChatTurn as IChatTurn } from "../types/IChatTurn.js";

let limits = {
  maxTextBytes: 1024 * 1024,
  maxPayloadBytes: 16 * 1024,
  maxEventCount: 20000,
};

export const _setChatStreamLimitsForTest = (
  overrides?: Partial<typeof limits>,
) => {
  if (overrides) {
    limits = { ...limits, ...overrides };
  } else {
    limits = {
      maxTextBytes: 1024 * 1024,
      maxPayloadBytes: 16 * 1024,
      maxEventCount: 20000,
    };
  }
};

export function toSnapshot(turn: IChatTurn): TurnSnapshot {
  const terminalStatuses = [
    "completed",
    "failed",
    "cancelled",
    "timed_out",
    "interrupted",
  ];
  const isTerminal = terminalStatuses.includes(turn.status);

  let result: PublicChatResult | undefined;
  if (isTerminal) {
    result = {
      turnId: turn._id,
      conversationId: turn.conversationId,
      status: turn.status as PublicChatResult["status"],
      mode: turn.mode ?? "auto",
      response: turn.response || turn.partialResponse || "",
      interactions: turn.interactions,
      activities: turn.activities,
      skillsRead: turn.skillsRead,
      uiSurface: turn.uiSurface,
      proposalId: turn.proposalId,
      terminalReason: turn.terminalReason,
    };
  }

  const deadlineDate = turn.deadlineAt ?? turn.expiresAt ?? new Date();

  return {
    turnId: turn._id,
    conversationId: turn.conversationId,
    requestId: turn.requestId,
    status: turn.status,
    partialResponse: turn.partialResponse ?? "",
    lastEventSeq: turn.lastEventSeq ?? 0,
    toolProgress: turn.toolProgress ?? [],
    deadlineAt: deadlineDate.toISOString(),
    ...(turn.terminalReason ? { terminalReason: turn.terminalReason } : {}),
    ...(result ? { result } : {}),
  };
}

export const chatStreamRepository = {
  toSnapshot,

  async getSnapshot(
    userId: string,
    conversationId: string,
    turnId: string,
  ): Promise<TurnSnapshot> {
    await ChatTurn.init();
    const turn = await ChatTurn.findOne({
      _id: turnId,
      userId,
      conversationId,
    }).lean();

    if (!turn) {
      throw new AppError(AI_ERROR.TURN_NOT_FOUND);
    }

    return toSnapshot(turn as unknown as IChatTurn);
  },

  async readEvents(
    userId: string,
    conversationId: string,
    turnId: string,
    after: number,
    limit = 100,
  ): Promise<ChatStreamEvent[]> {
    await ChatTurnEvent.init();
    const turn = await ChatTurn.findOne(
      { _id: turnId, userId, conversationId },
      { _id: 1, lastEventSeq: 1 },
    ).lean();

    if (!turn) {
      throw new AppError(AI_ERROR.TURN_NOT_FOUND);
    }

    if (
      after < 0 ||
      (turn.lastEventSeq !== undefined && after > turn.lastEventSeq)
    ) {
      throw new AppError(AI_ERROR.CHAT_CURSOR_INVALID);
    }

    const events = await ChatTurnEvent.find({
      turnId,
      seq: { $gt: after },
    })
      .sort({ seq: 1 })
      .limit(limit)
      .lean();

    return events.map((e) => ({
      id: String(e.seq),
      event: e.type,
      data: {
        version: 1,
        turnId: e.turnId,
        seq: e.seq,
        occurredAt: (e.createdAt ?? new Date()).toISOString(),
        payload: e.payload,
      },
    }));
  },

  async append(
    turnId: string,
    executionToken: string,
    event: ChatEventInput,
  ): Promise<ChatStreamEvent> {
    const payloadBytes = Buffer.byteLength(
      JSON.stringify(event.payload ?? {}),
      "utf8",
    );
    if (payloadBytes > limits.maxPayloadBytes) {
      throw new AppError(AI_ERROR.CHAT_OUTPUT_LIMIT);
    }

    return mongoose.connection.transaction(async (session) => {
      const turn = await ChatTurn.findOne({
        _id: turnId,
        executionToken,
        status: { $in: ["processing", "stopping"] },
      }).session(session);

      if (!turn) {
        throw new AppError(AI_ERROR.PROVIDER_TIMEOUT);
      }

      const currentSeq = turn.lastEventSeq ?? 0;
      if (currentSeq >= limits.maxEventCount) {
        throw new AppError(AI_ERROR.CHAT_OUTPUT_LIMIT);
      }

      if (event.type === "assistant.delta") {
        const newText = (turn.partialResponse || "") + event.payload.text;
        if (Buffer.byteLength(newText, "utf8") > limits.maxTextBytes) {
          throw new AppError(AI_ERROR.CHAT_OUTPUT_LIMIT);
        }
        turn.partialResponse = newText;
      } else if (event.type === "tool.started") {
        const list = turn.toolProgress ? [...turn.toolProgress] : [];
        const idx = list.findIndex(
          (t) => t.toolCallId === event.payload.toolCallId,
        );
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            label: event.payload.label,
            status: "started",
          };
        } else {
          list.push({
            toolCallId: event.payload.toolCallId,
            label: event.payload.label,
            status: "started",
          });
        }
        turn.toolProgress = list;
        turn.markModified("toolProgress");
      } else if (event.type === "tool.finished") {
        const list = turn.toolProgress ? [...turn.toolProgress] : [];
        const idx = list.findIndex(
          (t) => t.toolCallId === event.payload.toolCallId,
        );
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            status: event.payload.status,
            ...(event.payload.summary
              ? { summary: event.payload.summary }
              : {}),
          };
        } else {
          list.push({
            toolCallId: event.payload.toolCallId,
            label: "Đang xử lý tác vụ",
            status: event.payload.status,
            ...(event.payload.summary
              ? { summary: event.payload.summary }
              : {}),
          });
        }
        turn.toolProgress = list;
        turn.markModified("toolProgress");
      } else if (event.type === "turn.stopping") {
        turn.status = "stopping";
        turn.stopRequestedAt = new Date();
        turn.stopReason = event.payload.reason;
      }

      const nextSeq = currentSeq + 1;
      turn.lastEventSeq = nextSeq;
      await turn.save({ session });

      const [createdEvent] = await ChatTurnEvent.create(
        [
          {
            turnId,
            userId: turn.userId,
            conversationId: turn.conversationId,
            seq: nextSeq,
            type: event.type,
            payload: event.payload,
            createdAt: new Date(),
          },
        ],
        { session },
      );

      return {
        id: String(nextSeq),
        event: event.type,
        data: {
          version: 1,
          turnId,
          seq: nextSeq,
          occurredAt: (createdEvent.createdAt ?? new Date()).toISOString(),
          payload: event.payload,
        },
      };
    });
  },

  async requestStop(
    userId: string,
    conversationId: string,
    turnId: string,
    reason: "user" | "deadline",
  ): Promise<TurnSnapshot> {
    return mongoose.connection.transaction(async (session) => {
      const turn = await ChatTurn.findOne({
        _id: turnId,
        userId,
        conversationId,
      }).session(session);

      if (!turn) {
        throw new AppError(AI_ERROR.TURN_NOT_FOUND);
      }

      const terminalStatuses = [
        "completed",
        "failed",
        "cancelled",
        "timed_out",
        "interrupted",
      ];
      if (
        terminalStatuses.includes(turn.status) ||
        turn.status === "stopping"
      ) {
        return toSnapshot(turn as unknown as IChatTurn);
      }

      turn.status = "stopping";
      turn.stopRequestedAt = new Date();
      turn.stopReason = reason;
      const nextSeq = (turn.lastEventSeq ?? 0) + 1;
      turn.lastEventSeq = nextSeq;
      await turn.save({ session });

      await ChatTurnEvent.create(
        [
          {
            turnId,
            userId: turn.userId,
            conversationId: turn.conversationId,
            seq: nextSeq,
            type: "turn.stopping",
            payload: { reason },
            createdAt: new Date(),
          },
        ],
        { session },
      );

      return toSnapshot(turn as unknown as IChatTurn);
    });
  },

  async finish(
    turnId: string,
    executionToken: string,
    outcome: TurnOutcome,
  ): Promise<TurnSnapshot> {
    return mongoose.connection.transaction(async (session) => {
      const turn = await ChatTurn.findOne({ _id: turnId }).session(session);
      if (!turn) {
        throw new AppError(AI_ERROR.TURN_NOT_FOUND);
      }

      const terminalStatuses = [
        "completed",
        "failed",
        "cancelled",
        "timed_out",
        "interrupted",
      ];
      if (terminalStatuses.includes(turn.status)) {
        return toSnapshot(turn as unknown as IChatTurn);
      }

      if (turn.executionToken !== executionToken) {
        throw new AppError(AI_ERROR.PROVIDER_TIMEOUT);
      }

      turn.status = outcome.status;
      turn.terminalReason = outcome.terminalReason;
      turn.response = outcome.result.response || turn.partialResponse || "";
      turn.finishedAt = new Date();

      if (outcome.result.uiSurface !== undefined) {
        turn.uiSurface = outcome.result.uiSurface;
      }
      if (outcome.result.activities) {
        turn.activities = deduplicateActivities(outcome.result.activities);
      }
      if (outcome.result.skillsRead) {
        turn.skillsRead = outcome.result.skillsRead;
      }

      const nextSeq = (turn.lastEventSeq ?? 0) + 1;
      turn.lastEventSeq = nextSeq;
      await turn.save({ session });

      await ChatTurnEvent.create(
        [
          {
            turnId,
            userId: turn.userId,
            conversationId: turn.conversationId,
            seq: nextSeq,
            type: "turn.finished",
            payload: {
              status: outcome.status,
              ...(outcome.terminalReason
                ? { terminalReason: outcome.terminalReason }
                : {}),
              result: outcome.result,
            },
            createdAt: new Date(),
          },
        ],
        { session },
      );

      await ChatRunSlot.deleteOne({ turnId, executionToken }, { session });
      await Conversation.updateOne(
        { _id: turn.conversationId, activeTurn: turnId },
        { $set: { activeTurn: null, busyUntil: null } },
        { session },
      );

      return toSnapshot(turn as unknown as IChatTurn);
    });
  },
};
