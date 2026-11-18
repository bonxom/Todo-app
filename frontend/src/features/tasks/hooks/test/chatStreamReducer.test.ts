import { describe, expect, it } from "vitest";
import { reduceChatRun, type ChatRunState } from "../chatStreamReducer";
import type { TurnSnapshot } from "@/shared/types/chatStream";

describe("chatStreamReducer", () => {
  const turnId = "turn-reducer-1";
  const conversationId = "conv-reducer-1";

  const initialSnapshot: TurnSnapshot = {
    turnId,
    conversationId,
    requestId: "req-1",
    status: "processing",
    partialResponse: "",
    lastEventSeq: 1,
    toolProgress: [],
    deadlineAt: new Date().toISOString(),
  };

  const initialState: ChatRunState = {
    snapshot: initialSnapshot,
    connection: "live",
    reconnectAttempts: 0,
    messages: [
      {
        id: `${turnId}:bot`,
        sender: "bot",
        text: "",
        timestamp: initialSnapshot.deadlineAt,
      },
    ],
  };

  it("appends assistant.delta text in sequence and keeps message id ${turnId}:bot", () => {
    const action1 = {
      type: "EVENT" as const,
      event: {
        id: "2",
        event: "assistant.delta",
        data: {
          version: 1 as const,
          turnId,
          seq: 2,
          occurredAt: new Date().toISOString(),
          payload: { text: "Xin " },
        },
      },
    };

    const state1 = reduceChatRun(initialState, action1);
    expect(state1.snapshot?.partialResponse).toBe("Xin ");
    expect(state1.snapshot?.lastEventSeq).toBe(2);
    expect(state1.messages[0].id).toBe(`${turnId}:bot`);
    expect(state1.messages[0].text).toBe("Xin ");

    const action2 = {
      type: "EVENT" as const,
      event: {
        id: "3",
        event: "assistant.delta",
        data: {
          version: 1 as const,
          turnId,
          seq: 3,
          occurredAt: new Date().toISOString(),
          payload: { text: "chào!" },
        },
      },
    };

    const state2 = reduceChatRun(state1, action2);
    expect(state2.snapshot?.partialResponse).toBe("Xin chào!");
    expect(state2.snapshot?.lastEventSeq).toBe(3);
    expect(state2.messages[0].text).toBe("Xin chào!");
  });

  it("updates toolProgress in place on tool.started and tool.finished", () => {
    const startAction = {
      type: "EVENT" as const,
      event: {
        id: "2",
        event: "tool.started",
        data: {
          version: 1 as const,
          turnId,
          seq: 2,
          occurredAt: new Date().toISOString(),
          payload: { toolCallId: "call-1", label: "Tạo công việc" },
        },
      },
    };

    const state1 = reduceChatRun(initialState, startAction);
    expect(state1.snapshot?.toolProgress).toHaveLength(1);
    expect(state1.snapshot?.toolProgress[0]).toMatchObject({
      toolCallId: "call-1",
      label: "Tạo công việc",
      status: "started",
    });

    const finishAction = {
      type: "EVENT" as const,
      event: {
        id: "3",
        event: "tool.finished",
        data: {
          version: 1 as const,
          turnId,
          seq: 3,
          occurredAt: new Date().toISOString(),
          payload: {
            toolCallId: "call-1",
            status: "succeeded" as const,
            summary: "Đã tạo xong",
          },
        },
      },
    };

    const state2 = reduceChatRun(state1, finishAction);
    expect(state2.snapshot?.toolProgress).toHaveLength(1);
    expect(state2.snapshot?.toolProgress[0]).toMatchObject({
      toolCallId: "call-1",
      status: "succeeded",
      summary: "Đã tạo xong",
    });
  });

  it("detects sequence gap and sets connection to reconnecting while preserving cursor", () => {
    const gapAction = {
      type: "EVENT" as const,
      event: {
        id: "5",
        event: "assistant.delta",
        data: {
          version: 1 as const,
          turnId,
          seq: 5, // Gap: current lastEventSeq is 1, expected 2
          occurredAt: new Date().toISOString(),
          payload: { text: "Bị mất gói tin" },
        },
      },
    };

    const state = reduceChatRun(initialState, gapAction);
    expect(state.connection).toBe("reconnecting");
    // Cursor preserved at 1 to replay from 1
    expect(state.snapshot?.lastEventSeq).toBe(1);
    expect(state.snapshot?.partialResponse).toBe("");
  });

  it("ignores events from a different turnId or duplicate sequence numbers", () => {
    const wrongTurnAction = {
      type: "EVENT" as const,
      event: {
        id: "2",
        event: "assistant.delta",
        data: {
          version: 1 as const,
          turnId: "different-turn",
          seq: 2,
          occurredAt: new Date().toISOString(),
          payload: { text: "ignore me" },
        },
      },
    };

    const state1 = reduceChatRun(initialState, wrongTurnAction);
    expect(state1).toBe(initialState);

    const duplicateAction = {
      type: "EVENT" as const,
      event: {
        id: "1",
        event: "assistant.delta",
        data: {
          version: 1 as const,
          turnId,
          seq: 1, // already at seq 1
          occurredAt: new Date().toISOString(),
          payload: { text: "duplicate" },
        },
      },
    };

    const state2 = reduceChatRun(initialState, duplicateAction);
    expect(state2).toBe(initialState);
  });

  it("updates terminal status, result, and marks connection idle on turn.finished", () => {
    const finishAction = {
      type: "EVENT" as const,
      event: {
        id: "2",
        event: "turn.finished",
        data: {
          version: 1 as const,
          turnId,
          seq: 2,
          occurredAt: new Date().toISOString(),
          payload: {
            status: "completed" as const,
            result: {
              turnId,
              conversationId,
              status: "completed" as const,
              mode: "auto" as const,
              response: "Hoàn thành nhiệm vụ",
            },
          },
        },
      },
    };

    const state = reduceChatRun(initialState, finishAction);
    expect(state.snapshot?.status).toBe("completed");
    expect(state.connection).toBe("idle");
    expect(state.messages[0].text).toBe("Hoàn thành nhiệm vụ");
  });

  it("accepts turn.finished even when sequence gap occurs, avoiding endless reconnect", () => {
    const gapFinishAction = {
      type: "EVENT" as const,
      event: {
        id: "10",
        event: "turn.finished",
        data: {
          version: 1 as const,
          turnId,
          seq: 10, // Gap: current is 1, expected 2, but received 10
          occurredAt: new Date().toISOString(),
          payload: {
            status: "completed" as const,
            result: {
              turnId,
              conversationId,
              status: "completed" as const,
              mode: "auto" as const,
              response: "Kết quả cuối cùng đầy đủ",
            },
          },
        },
      },
    };

    const state = reduceChatRun(initialState, gapFinishAction);
    expect(state.snapshot?.status).toBe("completed");
    expect(state.connection).toBe("idle");
    expect(state.snapshot?.lastEventSeq).toBe(10);
    expect(state.messages[0].text).toBe("Kết quả cuối cùng đầy đủ");
  });

  it("SET_SNAPSHOT overwrites state cleanly", () => {
    const newSnapshot: TurnSnapshot = {
      turnId: "turn-new",
      conversationId: "conv-new",
      requestId: "req-new",
      status: "completed",
      partialResponse: "Tải lại trang",
      lastEventSeq: 4,
      toolProgress: [],
      deadlineAt: new Date().toISOString(),
    };

    const state = reduceChatRun(initialState, {
      type: "SET_SNAPSHOT",
      snapshot: newSnapshot,
    });

    expect(state.snapshot?.turnId).toBe("turn-new");
    expect(state.messages[0].id).toBe("turn-new:bot");
    expect(state.messages[0].text).toBe("Tải lại trang");
  });
});
