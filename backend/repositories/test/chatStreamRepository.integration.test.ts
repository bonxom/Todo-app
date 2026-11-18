import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ChatRunSlot from "../../models/ChatRunSlot.js";
import ChatTurn from "../../models/ChatTurn.js";
import ChatTurnEvent from "../../models/ChatTurnEvent.js";
import Conversation from "../../models/Conversation.js";
import {
  chatStreamRepository,
  _setChatStreamLimitsForTest,
} from "../chatStreamRepository.js";
import {
  connectChatTestMongo,
  disconnectChatTestMongo,
  createUserAndConversations,
  claimFor,
} from "../../test/helpers/chatMongo.js";
import { AppError } from "../../error/AppError.js";
import { AI_ERROR } from "../../error/definitions/aiErrors.js";

describe("chatStreamRepository and admission integration", () => {
  beforeAll(async () => {
    await connectChatTestMongo("orbit_stream_repo_test");
  });

  afterAll(async () => {
    _setChatStreamLimitsForTest();
    await disconnectChatTestMongo();
  });

  it("admits only three concurrent conversations for one user", async () => {
    const { userId, conversationIds } = await createUserAndConversations(4);
    const outcomes = await Promise.allSettled(
      conversationIds.map((id, n) => claimFor(userId, id, `request-${n}`)),
    );

    const fulfilled = outcomes.filter((r) => r.status === "fulfilled");
    const rejected = outcomes.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(3);
    expect(rejected).toHaveLength(1);

    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectedReason).toBeInstanceOf(AppError);
    expect((rejectedReason as AppError).statusCode).toBe(429);
    expect((rejectedReason as AppError).code).toBe(
      AI_ERROR.CHAT_CONCURRENCY_LIMIT.code,
    );

    expect(await ChatRunSlot.countDocuments({ userId })).toBe(3);
  });

  it("allows a second user their own independent 3 concurrency slots", async () => {
    const user1 = await createUserAndConversations(3, 1);
    const user2 = await createUserAndConversations(3, 2);

    const claims1 = await Promise.all(
      user1.conversationIds.map((id, n) =>
        claimFor(user1.userId, id, `u1-req-${n}`),
      ),
    );
    const claims2 = await Promise.all(
      user2.conversationIds.map((id, n) =>
        claimFor(user2.userId, id, `u2-req-${n}`),
      ),
    );

    expect(claims1).toHaveLength(3);
    expect(claims2).toHaveLength(3);
    expect(await ChatRunSlot.countDocuments({ userId: user1.userId })).toBe(3);
    expect(await ChatRunSlot.countDocuments({ userId: user2.userId })).toBe(3);
  });

  it("rejects concurrent claims on the same conversation with CONVERSATION_BUSY", async () => {
    const { userId, conversationIds } = await createUserAndConversations(1);
    const convId = conversationIds[0];

    const outcomes = await Promise.allSettled([
      claimFor(userId, convId, "race-req-1"),
      claimFor(userId, convId, "race-req-2"),
    ]);

    const fulfilled = outcomes.filter((r) => r.status === "fulfilled");
    const rejected = outcomes.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const err = (rejected[0] as PromiseRejectedResult).reason;
    expect((err as AppError).statusCode).toBe(409);
    expect((err as AppError).code).toBe(AI_ERROR.CONVERSATION_BUSY.code);
  });

  it("deduplicates requests with same requestId and payload without leaking slots", async () => {
    const { userId, conversationIds } = await createUserAndConversations(1);
    const convId = conversationIds[0];

    const first = await claimFor(userId, convId, "idempotent-req-1", {
      userInput: "Xin chào",
    });
    expect(first.claimed).toBe(true);

    const second = await claimFor(userId, convId, "idempotent-req-1", {
      userInput: "Xin chào",
    });
    expect(second.claimed).toBe(false);
    expect(second.turn._id).toBe(first.turn._id);

    expect(await ChatRunSlot.countDocuments({ userId })).toBe(1);
  });

  it("rejects conflicting payload for same requestId with CHAT_REQUEST_CONFLICT", async () => {
    const { userId, conversationIds } = await createUserAndConversations(1);
    const convId = conversationIds[0];

    await claimFor(userId, convId, "conflict-req-1", {
      userInput: "Original text",
    });

    await expect(
      claimFor(userId, convId, "conflict-req-1", {
        userInput: "Changed text",
      }),
    ).rejects.toThrowError();
  });

  it("enforces owner isolation on getSnapshot and readEvents", async () => {
    const user1 = await createUserAndConversations(1, 10);
    const user2 = await createUserAndConversations(1, 20);

    const claim = await claimFor(
      user1.userId,
      user1.conversationIds[0],
      "owner-test-req",
    );
    const turnId = claim.turn._id;

    // user1 can read
    const snapshot1 = await chatStreamRepository.getSnapshot(
      user1.userId,
      user1.conversationIds[0],
      turnId,
    );
    expect(snapshot1.turnId).toBe(turnId);

    // user2 cannot read
    await expect(
      chatStreamRepository.getSnapshot(
        user2.userId,
        user1.conversationIds[0],
        turnId,
      ),
    ).rejects.toThrow(AppError);

    await expect(
      chatStreamRepository.readEvents(
        user2.userId,
        user1.conversationIds[0],
        turnId,
        0,
        50,
      ),
    ).rejects.toThrow(AppError);
  });

  it("creates initial turn.started event on claim with seq 1", async () => {
    const { userId, conversationIds } = await createUserAndConversations(1);
    const claim = await claimFor(userId, conversationIds[0], "start-event-req");
    const turnId = claim.turn._id;

    const events = await chatStreamRepository.readEvents(
      userId,
      conversationIds[0],
      turnId,
      0,
      10,
    );
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("1");
    expect(events[0].event).toBe("turn.started");
    expect(events[0].data.seq).toBe(1);
    expect(events[0].data.payload).toHaveProperty("deadlineAt");
  });

  it("appends delta, tool progress and enforces atomic seq and snapshot", async () => {
    const { userId, conversationIds } = await createUserAndConversations(1);
    const claim = await claimFor(userId, conversationIds[0], "append-flow-req");
    const turnId = claim.turn._id;
    const token = claim.turn.executionToken;

    // Append text delta 1
    const ev2 = await chatStreamRepository.append(turnId, token, {
      type: "assistant.delta",
      payload: { messageId: `${turnId}:bot`, text: "Chào " },
    });
    expect(ev2.data.seq).toBe(2);

    // Append text delta 2
    const ev3 = await chatStreamRepository.append(turnId, token, {
      type: "assistant.delta",
      payload: { messageId: `${turnId}:bot`, text: "bạn!" },
    });
    expect(ev3.data.seq).toBe(3);

    // Append tool started
    const ev4 = await chatStreamRepository.append(turnId, token, {
      type: "tool.started",
      payload: { toolCallId: "call-1", label: "Đang tìm kiếm tác vụ" },
    });
    expect(ev4.data.seq).toBe(4);

    // Append tool finished
    const ev5 = await chatStreamRepository.append(turnId, token, {
      type: "tool.finished",
      payload: {
        toolCallId: "call-1",
        status: "succeeded",
        summary: "Tìm thấy 3 tác vụ",
      },
    });
    expect(ev5.data.seq).toBe(5);

    // Verify snapshot
    const snapshot = await chatStreamRepository.getSnapshot(
      userId,
      conversationIds[0],
      turnId,
    );
    expect(snapshot.lastEventSeq).toBe(5);
    expect(snapshot.partialResponse).toBe("Chào bạn!");
    expect(snapshot.toolProgress).toHaveLength(1);
    expect(snapshot.toolProgress[0]).toEqual({
      toolCallId: "call-1",
      label: "Đang tìm kiếm tác vụ",
      status: "succeeded",
      summary: "Tìm thấy 3 tác vụ",
    });

    // Public snapshot projection must not contain executionToken or messages
    expect(
      (snapshot as unknown as Record<string, unknown>).executionToken,
    ).toBeUndefined();
    expect(
      (snapshot as unknown as Record<string, unknown>).messages,
    ).toBeUndefined();
  });

  it("enforces output limit on text, payload size and event count via test limits", async () => {
    const { userId, conversationIds } = await createUserAndConversations(1);
    const claim = await claimFor(userId, conversationIds[0], "limits-req");
    const turnId = claim.turn._id;
    const token = claim.turn.executionToken;

    // Test payload size limit
    _setChatStreamLimitsForTest({ maxPayloadBytes: 50 });
    await expect(
      chatStreamRepository.append(turnId, token, {
        type: "assistant.delta",
        payload: {
          messageId: "m1",
          text: "A very long message payload that exceeds fifty bytes definitely",
        },
      }),
    ).rejects.toThrow(AppError);

    // Test text accumulation limit
    _setChatStreamLimitsForTest({ maxTextBytes: 20, maxPayloadBytes: 1000 });
    await chatStreamRepository.append(turnId, token, {
      type: "assistant.delta",
      payload: { messageId: "m2", text: "123456789012345" },
    });
    await expect(
      chatStreamRepository.append(turnId, token, {
        type: "assistant.delta",
        payload: { messageId: "m2", text: "1234567890" },
      }),
    ).rejects.toThrow(AppError);

    // Test event count limit
    _setChatStreamLimitsForTest({ maxEventCount: 2 });
    await expect(
      chatStreamRepository.append(turnId, token, {
        type: "tool.started",
        payload: { toolCallId: "c2", label: "Over limit" },
      }),
    ).rejects.toThrow(AppError);

    _setChatStreamLimitsForTest(); // reset
  });

  it("handles requestStop idempotently and transitions processing to stopping", async () => {
    const { userId, conversationIds } = await createUserAndConversations(1);
    const claim = await claimFor(userId, conversationIds[0], "stop-test-req");
    const turnId = claim.turn._id;

    const stop1 = await chatStreamRepository.requestStop(
      userId,
      conversationIds[0],
      turnId,
      "user",
    );
    expect(stop1.status).toBe("stopping");

    const stop2 = await chatStreamRepository.requestStop(
      userId,
      conversationIds[0],
      turnId,
      "user",
    );
    expect(stop2.status).toBe("stopping");
    expect(stop2.lastEventSeq).toBe(stop1.lastEventSeq);

    const events = await chatStreamRepository.readEvents(
      userId,
      conversationIds[0],
      turnId,
      0,
      10,
    );
    const stopEvents = events.filter((e) => e.event === "turn.stopping");
    expect(stopEvents).toHaveLength(1);
    expect(stopEvents[0].data.payload).toEqual({ reason: "user" });
  });

  it("finishes a turn, appends terminal event, releases slot and conversation lock", async () => {
    const { userId, conversationIds } = await createUserAndConversations(1);
    const claim = await claimFor(userId, conversationIds[0], "finish-test-req");
    const turnId = claim.turn._id;
    const token = claim.turn.executionToken;

    expect(await ChatRunSlot.countDocuments({ userId })).toBe(1);
    expect((await Conversation.findById(conversationIds[0]))?.activeTurn).toBe(
      turnId,
    );

    const snapshot = await chatStreamRepository.finish(turnId, token, {
      status: "completed",
      result: {
        turnId,
        conversationId: conversationIds[0],
        status: "completed",
        mode: "auto",
        response: "Tất cả đã hoàn thành.",
      },
    });

    expect(snapshot.status).toBe("completed");
    expect(snapshot.result?.response).toBe("Tất cả đã hoàn thành.");

    // Slot released
    expect(await ChatRunSlot.countDocuments({ userId })).toBe(0);

    // Conversation unlocked
    const conv = await Conversation.findById(conversationIds[0]);
    expect(conv?.activeTurn).toBeNull();
    expect(conv?.busyUntil).toBeNull();

    // Terminal event turn.finished present
    const events = await chatStreamRepository.readEvents(
      userId,
      conversationIds[0],
      turnId,
      0,
      10,
    );
    const finishedEvents = events.filter((e) => e.event === "turn.finished");
    expect(finishedEvents).toHaveLength(1);
    expect(finishedEvents[0].data.payload).toMatchObject({
      status: "completed",
    });

    // Calling finish again is idempotent
    const rerun = await chatStreamRepository.finish(turnId, token, {
      status: "completed",
      result: {
        turnId,
        conversationId: conversationIds[0],
        status: "completed",
        mode: "auto",
        response: "Tất cả đã hoàn thành.",
      },
    });
    expect(rerun.status).toBe("completed");
    const eventsAfter = await chatStreamRepository.readEvents(
      userId,
      conversationIds[0],
      turnId,
      0,
      10,
    );
    expect(eventsAfter.filter((e) => e.event === "turn.finished")).toHaveLength(
      1,
    );
  });
});
