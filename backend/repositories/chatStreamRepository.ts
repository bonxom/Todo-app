import mongoose from "mongoose";
import { publicInteraction } from "../utils/conversationView.js";
import ChatTurn from "../models/ChatTurn.js";
import ChatTurnEvent from "../models/ChatTurnEvent.js";
import ChatRunSlot from "../models/ChatRunSlot.js";
import Conversation from "../models/Conversation.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";
import { deduplicateActivities } from "../utils/agentActivity.js";
import { chatStreamBus } from "../services/chatStreamBus.js";
import { getWebPushConfig } from "../config/webPush.js";
import { pushDispatchService } from "../services/pushDispatchService.js";
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

const dispatchedPushTurns = new Set<string>();
const MAX_PUSH_DEDUP_ENTRIES = 2000;

function trackCompletedPushTurn(turnId: string): boolean {
  if (dispatchedPushTurns.has(turnId)) return false;
  if (dispatchedPushTurns.size >= MAX_PUSH_DEDUP_ENTRIES) {
    const oldest = dispatchedPushTurns.values().next().value;
    if (oldest !== undefined) dispatchedPushTurns.delete(oldest);
  }
  dispatchedPushTurns.add(turnId);
  return true;
}

async function dispatchAgentReplyPush(conversationId: string): Promise<void> {
  try {
    const conversation = await Conversation.findById(conversationId)
      .select("userId title")
      .lean();
    if (!conversation?.userId) return;
    await pushDispatchService.notifyAgentReply({
      userId: String(conversation.userId),
      conversationId,
      conversationTitle: conversation.title ?? null,
    });
  } catch {
    // Best-effort push delivery must never disrupt stream finalization.
  }
}

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
      ...(turn.interactions?.find((i) => i.status === "pending")
        ? {
            interaction: publicInteraction(
              turn.interactions.find((i) => i.status === "pending")!,
            ),
          }
        : {}),
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
    ...(turn.reasoningBlocks?.length
      ? { reasoningBlocks: turn.reasoningBlocks }
      : {}),
    deadlineAt: deadlineDate.toISOString(),
    ...(turn.terminalReason ? { terminalReason: turn.terminalReason } : {}),
    ...(result ? { result: turn.finalResult ?? result } : {}),
  };
}

export const chatStreamRepository = {
  _resetPushDedupForTest() {
    dispatchedPushTurns.clear();
  },
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

    const baseSnapshot = toSnapshot(turn as unknown as IChatTurn);
    const live = chatStreamBus.getLiveSnapshot(turnId);

    if (live) {
      return {
        ...baseSnapshot,
        status: live.status,
        partialResponse: live.partialResponse,
        lastEventSeq: live.lastEventSeq,
        toolProgress: live.toolProgress,
        ...(live.reasoningBlocks?.length
          ? { reasoningBlocks: live.reasoningBlocks }
          : {}),
      };
    }

    return baseSnapshot;
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

    const liveEvents = chatStreamBus.getLiveEvents(turnId, after, limit);
    if (liveEvents !== null) {
      const live = chatStreamBus.getLiveSnapshot(turnId);
      if (live && after > live.lastEventSeq) {
        throw new AppError(AI_ERROR.CHAT_CURSOR_INVALID);
      }
      return liveEvents;
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
      } else if (event.type === "reasoning.delta") {
        const blocks = turn.reasoningBlocks ? [...turn.reasoningBlocks] : [];
        const totalChars = blocks.reduce((sum, b) => sum + b.text.length, 0);
        const remaining = Math.max(0, 32_000 - totalChars);
        if (remaining > 0) {
          const slice = event.payload.text.slice(0, remaining);
          const idx = blocks.findIndex(
            (b) => b.blockId === event.payload.blockId,
          );
          if (idx >= 0) {
            blocks[idx] = {
              ...blocks[idx],
              text: blocks[idx].text + slice,
            };
          } else {
            blocks.push({
              blockId: event.payload.blockId,
              text: slice,
              order: currentSeq + 1,
            });
          }
          turn.reasoningBlocks = blocks;
          turn.markModified("reasoningBlocks");
        }
      } else if (event.type === "tool.started") {
        const list = turn.toolProgress ? [...turn.toolProgress] : [];
        const idx = list.findIndex(
          (t) => t.toolCallId === event.payload.toolCallId,
        );
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            ...(event.payload.toolName
              ? { toolName: event.payload.toolName }
              : {}),
            label: event.payload.label,
            status: "started",
          };
        } else {
          list.push({
            toolCallId: event.payload.toolCallId,
            ...(event.payload.toolName
              ? { toolName: event.payload.toolName }
              : {}),
            label: event.payload.label,
            status: "started",
            order: currentSeq + 1,
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
            ...(event.payload.toolName
              ? { toolName: event.payload.toolName }
              : {}),
            status: event.payload.status,
            ...(event.payload.summary
              ? { summary: event.payload.summary }
              : {}),
          };
        } else {
          list.push({
            toolCallId: event.payload.toolCallId,
            ...(event.payload.toolName
              ? { toolName: event.payload.toolName }
              : {}),
            label: "Đang xử lý tác vụ",
            status: event.payload.status,
            ...(event.payload.summary
              ? { summary: event.payload.summary }
              : {}),
            order: currentSeq + 1,
          });
        }
        turn.toolProgress = list;
        turn.markModified("toolProgress");
      } else if (event.type === "activity.recorded") {
        turn.activities = deduplicateActivities([
          ...(turn.activities ?? []),
          event.payload.activity,
        ]);
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

      const streamEvent: ChatStreamEvent = {
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

      chatStreamBus.publish(turnId, streamEvent);

      return streamEvent;
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

      const live = chatStreamBus.getLiveSnapshot(turnId);
      const currentLastSeq = live?.lastEventSeq ?? turn.lastEventSeq ?? 0;

      if (!chatStreamBus.hasLiveTurn(turnId)) {
        const nextSeq = currentLastSeq + 1;
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
      } else {
        turn.lastEventSeq = currentLastSeq;
        await turn.save({ session });
      }

      chatStreamBus.publish(turnId);

      return toSnapshot(turn as unknown as IChatTurn);
    });
  },

  postFinishNotification(
    turnId: string,
    outcome: TurnOutcome,
    snapshot: TurnSnapshot,
  ): void {
    const finishPayload = {
      status: outcome.status,
      ...(outcome.terminalReason
        ? { terminalReason: outcome.terminalReason }
        : {}),
      result: snapshot.result ?? {
        turnId,
        conversationId: snapshot.conversationId,
        status: outcome.status,
        response: snapshot.partialResponse || "",
      },
    };

    if (chatStreamBus.hasLiveTurn(turnId)) {
      chatStreamBus.emitLiveEvent(turnId, {
        type: "turn.finished",
        payload: finishPayload,
      });
      chatStreamBus.scheduleCleanup(turnId, 60_000);
    } else {
      chatStreamBus.publish(turnId);
    }

    if (
      outcome.status === "completed" &&
      snapshot.status === "completed" &&
      getWebPushConfig().supported &&
      trackCompletedPushTurn(turnId)
    ) {
      void dispatchAgentReplyPush(snapshot.conversationId);
    }
  },

  async finish(
    turnId: string,
    executionToken: string,
    outcome: TurnOutcome,
  ): Promise<TurnSnapshot> {
    const snapshot = await mongoose.connection.transaction((session) =>
      this.finishInSession(turnId, executionToken, outcome, session),
    );
    this.postFinishNotification(turnId, outcome, snapshot);
    return snapshot;
  },

  async finishInSession(
    turnId: string,
    executionToken: string,
    outcome: TurnOutcome,
    session: mongoose.ClientSession,
  ): Promise<TurnSnapshot> {
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

    // Stop/deadline wins over a completion that has not committed yet.
    if (
      outcome.status === "completed" &&
      (turn.status === "stopping" ||
        (turn.deadlineAt && turn.deadlineAt.getTime() <= Date.now()))
    ) {
      const status =
        turn.stopReason === "deadline" ||
        (turn.deadlineAt && turn.deadlineAt.getTime() <= Date.now())
          ? "timed_out"
          : "cancelled";
      outcome = {
        status,
        terminalReason:
          status === "timed_out" ? "deadline_exceeded" : "user_cancelled",
        result: {
          conversationId: turn.conversationId,
          status,
          response: turn.partialResponse || "",
        },
      };
    }
    const live = chatStreamBus.getLiveSnapshot(turnId);
    const finalPartial = live?.partialResponse || turn.partialResponse || "";
    const finalToolProgress = live?.toolProgress || turn.toolProgress || [];
    const finalReasoningBlocks =
      live?.reasoningBlocks || turn.reasoningBlocks || [];
    const finalLastSeq = live?.lastEventSeq ?? turn.lastEventSeq ?? 0;

    const persistedResponse =
      outcome.result.companionText || outcome.result.response || finalPartial;
    const publicResponse = outcome.result.response || persistedResponse;

    turn.status = outcome.status;
    turn.terminalReason = outcome.terminalReason;
    turn.response = persistedResponse;
    turn.partialResponse = persistedResponse;
    if (finalToolProgress.length > 0) {
      turn.toolProgress = finalToolProgress;
    }
    if (finalReasoningBlocks.length > 0) {
      turn.reasoningBlocks = finalReasoningBlocks;
    }
    turn.finishedAt = new Date();
    if (outcome.interaction)
      turn.interactions = [...turn.interactions, outcome.interaction];
    if (outcome.uiSurface !== undefined) turn.uiSurface = outcome.uiSurface;
    if (outcome.proposalId) turn.proposalId = outcome.proposalId;
    const canonicalResult: PublicChatResult = {
      ...outcome.result,
      requestId: turn.requestId,
      turnId,
      status: outcome.status,
      data: publicResponse,
      response: publicResponse,
      ...(outcome.result.companionText
        ? { companionText: outcome.result.companionText }
        : {}),
      activities: outcome.result.activities ?? turn.activities ?? [],
      skillsRead: outcome.result.skillsRead ?? turn.skillsRead ?? [],
      ...(outcome.terminalReason
        ? { terminalReason: outcome.terminalReason }
        : {}),
    };
    turn.finalResult = canonicalResult;

    if (outcome.result.uiSurface !== undefined) {
      turn.uiSurface = outcome.result.uiSurface;
    }
    if (outcome.result.activities) {
      turn.activities = deduplicateActivities(outcome.result.activities);
    }
    if (outcome.result.skillsRead) {
      turn.skillsRead = outcome.result.skillsRead;
    }
    if (outcome.status === "interrupted" && Array.isArray(turn.toolProgress)) {
      turn.toolProgress = turn.toolProgress.map((tp) =>
        tp.status === "started" ? { ...tp, status: "unknown" } : tp,
      );
    }

    const finishPayload = {
      status: outcome.status,
      ...(outcome.terminalReason
        ? { terminalReason: outcome.terminalReason }
        : {}),
      result: canonicalResult,
    };

    const nextSeq = finalLastSeq + 1;
    turn.lastEventSeq = nextSeq;
    await turn.save({ session });

    const liveTurn = chatStreamBus.getLiveTurn(turnId);
    if (liveTurn && liveTurn.events.length > 0) {
      const docsToInsert = [
        ...liveTurn.events.map((e) => ({
          turnId,
          userId: turn.userId,
          conversationId: turn.conversationId,
          seq: e.data.seq,
          type: e.event,
          payload: e.data.payload,
          createdAt: new Date(e.data.occurredAt || Date.now()),
        })),
        {
          turnId,
          userId: turn.userId,
          conversationId: turn.conversationId,
          seq: nextSeq,
          type: "turn.finished",
          payload: finishPayload,
          createdAt: new Date(),
        },
      ];
      await ChatTurnEvent.insertMany(docsToInsert, {
        session,
        ordered: false,
      }).catch(() => {});
    } else {
      await ChatTurnEvent.create(
        [
          {
            turnId,
            userId: turn.userId,
            conversationId: turn.conversationId,
            seq: nextSeq,
            type: "turn.finished",
            payload: finishPayload,
            createdAt: new Date(),
          },
        ],
        { session },
      );
    }

    await ChatRunSlot.deleteOne({ turnId, executionToken }, { session });
    await Conversation.updateOne(
      { _id: turn.conversationId, activeTurn: turnId },
      { $set: { activeTurn: null, busyUntil: null } },
      { session },
    );

    return toSnapshot(turn as unknown as IChatTurn);
  },
};
