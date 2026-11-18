import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import ChatRunSlot from "../../models/ChatRunSlot.js";
import ChatTurn from "../../models/ChatTurn.js";
import Conversation from "../../models/Conversation.js";
import { chatStreamRepository } from "../../repositories/chatStreamRepository.js";
import { recoverInterruptedRuns } from "../chatRunRecoveryService.js";
import {
  connectChatTestMongo,
  disconnectChatTestMongo,
  createUserAndConversations,
  claimFor,
  hasChatTestMongo,
} from "../../test/helpers/chatMongo.js";

describe.skipIf(!hasChatTestMongo())(
  "chatRunRecoveryService integration",
  () => {
    beforeAll(async () => {
      await connectChatTestMongo("orbit_recovery_test");
    });

    afterAll(async () => {
      await disconnectChatTestMongo();
    });

    it("recovers processing and stopping runs, marks unfinished tools unknown and releases slots", async () => {
      const { userId, conversationIds } = await createUserAndConversations(2);

      // 1. Seed processing run with partial text and a started tool
      const claim1 = await claimFor(
        userId,
        conversationIds[0],
        "recovery-req-1",
      );
      const turn1Id = claim1.turn._id;
      const token1 = claim1.turn.executionToken;

      await chatStreamRepository.append(turn1Id, token1, {
        type: "assistant.delta",
        payload: { messageId: `${turn1Id}:bot`, text: "Đang phân tích" },
      });
      await chatStreamRepository.append(turn1Id, token1, {
        type: "tool.started",
        payload: { toolCallId: "call-unfinished", label: "Tạo công việc" },
      });

      // 2. Seed stopping run
      const claim2 = await claimFor(
        userId,
        conversationIds[1],
        "recovery-req-2",
      );
      const turn2Id = claim2.turn._id;
      await chatStreamRepository.requestStop(
        userId,
        conversationIds[1],
        turn2Id,
        "user",
      );

      expect(await ChatRunSlot.countDocuments({ turnId: turn1Id })).toBe(1);
      expect(await ChatRunSlot.countDocuments({ turnId: turn2Id })).toBe(1);

      // Run recovery
      const recoveredCount1 = await recoverInterruptedRuns("instance-test-1");
      expect(recoveredCount1).toBe(2);

      // Second recovery call is idempotent and finds nothing
      const recoveredCount2 = await recoverInterruptedRuns("instance-test-1");
      expect(recoveredCount2).toBe(0);

      // Verify turn 1 snapshot
      const snapshot1 = await chatStreamRepository.getSnapshot(
        userId,
        conversationIds[0],
        turn1Id,
      );
      expect(snapshot1.status).toBe("interrupted");
      expect(snapshot1.partialResponse).toBe("Đang phân tích");
      expect(snapshot1.toolProgress).toHaveLength(1);
      expect(snapshot1.toolProgress[0].status).toBe("unknown");

      // Verify slots and conversation locks released
      expect(await ChatRunSlot.countDocuments({ turnId: turn1Id })).toBe(0);
      expect(await ChatRunSlot.countDocuments({ turnId: turn2Id })).toBe(0);

      const conv1 = await Conversation.findById(conversationIds[0]);
      expect(conv1?.activeTurn).toBeNull();
      expect(conv1?.busyUntil).toBeNull();

      const conv2 = await Conversation.findById(conversationIds[1]);
      expect(conv2?.activeTurn).toBeNull();
      expect(conv2?.busyUntil).toBeNull();

      // Verify terminal events recorded
      const events1 = await chatStreamRepository.readEvents(
        userId,
        conversationIds[0],
        turn1Id,
        0,
        10,
      );
      const finishedEvents1 = events1.filter(
        (e) => e.event === "turn.finished",
      );
      expect(finishedEvents1).toHaveLength(1);
      expect(finishedEvents1[0].data.payload).toMatchObject({
        status: "interrupted",
      });
    });

    it("propagates DB error to prevent startup when database failure occurs", async () => {
      vi.spyOn(ChatTurn, "find").mockImplementationOnce(() => {
        throw new Error("Mongo connection lost");
      });

      await expect(
        recoverInterruptedRuns("instance-fail-test"),
      ).rejects.toThrow("Mongo connection lost");
    });
  },
);
