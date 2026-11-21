import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { turnMessages } from "../conversationView.js";
import type { ChatTurn } from "../../types/IChatTurn.js";

function makeTurn(overrides: Partial<ChatTurn> = {}): ChatTurn {
  const now = new Date("2026-11-21T10:00:00.000Z");
  return {
    _id: "turn-1",
    conversationId: "conv-1",
    userId: new mongoose.Types.ObjectId(),
    requestId: "req-1",
    sequence: 1,
    executionToken: "tok-1",
    status: "completed",
    mode: "auto",
    userInput: "List my tasks",
    response: "Here are your tasks.",
    messages: [],
    interactions: [],
    activities: [],
    skillsRead: [],
    toolProgress: [],
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 300_000),
    ...overrides,
  };
}

describe("turnMessages", () => {
  it("includes persisted toolProgress on completed bot messages", () => {
    const turn = makeTurn({
      toolProgress: [
        {
          toolCallId: "call-1",
          label: "Đang tìm kiếm công việc",
          status: "succeeded",
          summary: "Đã tìm kiếm công việc",
        },
      ],
    });

    const messages = turnMessages(turn);
    const bot = messages.find((m) => m.sender === "bot");
    expect(bot).toBeDefined();
    expect((bot as { toolProgress?: unknown }).toolProgress).toEqual([
      {
        toolCallId: "call-1",
        label: "Đang tìm kiếm công việc",
        status: "succeeded",
        summary: "Đã tìm kiếm công việc",
      },
    ]);
  });

  it("omits toolProgress when a turn has no tool calls", () => {
    const turn = makeTurn({ toolProgress: [] });
    const messages = turnMessages(turn);
    const bot = messages.find((m) => m.sender === "bot");
    expect(bot).toBeDefined();
    expect("toolProgress" in (bot as object)).toBe(false);
  });

  it("includes persisted reasoningBlocks on completed bot messages when present", () => {
    const turn = makeTurn({
      reasoningBlocks: [
        { blockId: "turn-1:r0", text: "Plan step 1", order: 1 },
      ],
    });
    const messages = turnMessages(turn);
    const bot = messages.find((m) => m.sender === "bot");
    expect((bot as { reasoningBlocks?: unknown }).reasoningBlocks).toEqual([
      { blockId: "turn-1:r0", text: "Plan step 1", order: 1 },
    ]);
  });

  it("includes companionText on bot messages when presentation envelope carries it", () => {
    const turn = makeTurn({
      response: "Mình đã tổng hợp lịch học của bạn bên dưới:",
    });
    const messages = turnMessages(turn, {
      text: "Fallback summary",
      companionText: "Mình đã tổng hợp lịch học của bạn bên dưới:",
    } as never);
    const bot = messages.find((m) => m.sender === "bot");
    expect(bot).toBeDefined();
    expect((bot as { companionText?: string }).companionText).toBe(
      "Mình đã tổng hợp lịch học của bạn bên dưới:",
    );
  });
});
