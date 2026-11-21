import TaskProposal from "../../models/A2UI/TaskProposal.js";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  connectChatTestMongo,
  disconnectChatTestMongo,
  createUserAndConversations,
  claimFor,
  hasChatTestMongo,
} from "../../test/helpers/chatMongo.js";
import User from "../../models/User.js";
import ChatTurn from "../../models/ChatTurn.js";
import { agentService } from "../agentService.js";
import { chatRunService } from "../chatRunService.js";
import { chatStreamRepository } from "../../repositories/chatStreamRepository.js";
import { conversationService } from "../conversationService.js";
import type { AgentInteraction } from "../../types/IAgent.js";

describe.skipIf(!hasChatTestMongo())("real streaming turn lifecycle", () => {
  beforeAll(async () => {
    await connectChatTestMongo("orbit_chat_lifecycle");
  });
  afterEach(async () => {
    await chatRunService.shutdown();
    chatRunService._resetForTest();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  afterAll(disconnectChatTestMongo);

  it.each([
    "success",
    "cancel",
    "provider_error",
    "deadline",
    "menu",
    "proposal",
    "proposal_deadline",
  ] as const)(
    "persists exactly one correct terminal event for %s",
    async (scenario) => {
      vi.stubEnv(
        "A2UI_TASK_PROPOSALS_ENABLED",
        scenario.startsWith("proposal") ? "true" : "false",
      );
      const { userId, conversationIds } = await createUserAndConversations(1);
      const conversationId = conversationIds[0];
      const user = (await User.findById(userId))!;
      const { turn } = await claimFor(
        userId,
        conversationId,
        `lifecycle-${scenario}`,
      );
      if (scenario === "deadline") {
        turn.deadlineAt = new Date(Date.now() + 250);
        await turn.save();
      }
      let entered!: () => void;
      const firstDelta = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let allowFinish!: () => void;
      const finishAllowed = new Promise<void>((resolve) => {
        allowFinish = resolve;
      });
      const interaction: AgentInteraction = {
        id: "menu-question",
        kind: "clarification",
        question: "Which direction?",
        options: [{ id: "first", label: "First" }],
        allowCustomAnswer: true,
        status: "pending",
        toolCallId: "private-tool-id",
      };
      vi.spyOn(agentService, "chatWithMcp").mockImplementation(
        async (_input, _context, memory) => {
          await memory!.stream!.emit({
            type: "assistant.delta",
            payload: {
              messageId: `${turn._id}:bot`,
              text: "Nội dung đang viết",
            },
          });
          entered();
          if (scenario === "cancel" || scenario === "deadline") {
            await new Promise<void>((_resolve, reject) =>
              memory!.stream!.signal.addEventListener(
                "abort",
                () => reject(new Error("aborted")),
                { once: true },
              ),
            );
          }
          await finishAllowed;
          if (scenario.startsWith("proposal"))
            return {
              proposalItems: [
                { title: "Review streaming", priority: "Medium" },
              ],
            };
          if (scenario === "provider_error")
            throw new Error("provider offline");
          if (scenario === "menu") return { interaction };
          return "Nội dung đang viết";
        },
      );
      if (scenario === "proposal_deadline") {
        const finish = chatStreamRepository.finishInSession;
        vi.spyOn(
          chatStreamRepository,
          "finishInSession",
        ).mockImplementationOnce(async (id, token, outcome, session) => {
          await ChatTurn.updateOne(
            { _id: id },
            { $set: { deadlineAt: new Date(Date.now() - 1) } },
            { session },
          );
          return finish.call(chatStreamRepository, id, token, outcome, session);
        });
      }
      chatRunService.start(turn.toObject(), {
        user,
        requestId: turn.requestId,
        scopes: ["tasks:write"],
      });
      await firstDelta;
      const live = await chatStreamRepository.getSnapshot(
        userId,
        conversationId,
        turn._id,
      );
      expect(live.status).toBe("processing");
      expect(live.partialResponse).toBe("Nội dung đang viết");
      if (scenario === "cancel")
        await chatRunService.cancel(userId, conversationId, turn._id);
      allowFinish();
      await vi.waitFor(
        () => expect(chatRunService.hasActiveRun(turn._id)).toBe(false),
        { timeout: 5000 },
      );
      const snapshot = await chatStreamRepository.getSnapshot(
        userId,
        conversationId,
        turn._id,
      );
      const expected = {
        success: "completed",
        cancel: "cancelled",
        provider_error: "failed",
        deadline: "timed_out",
        menu: "completed",
        proposal: "completed",
        proposal_deadline: "timed_out",
      }[scenario];
      expect(snapshot.status).toBe(expected);
      const events = await chatStreamRepository.readEvents(
        userId,
        conversationId,
        turn._id,
        0,
      );
      const finals = events.filter((event) => event.event === "turn.finished");
      expect(finals).toHaveLength(1);
      expect(finals[0].data.payload).toMatchObject({ status: expected });
      if (scenario === "menu") {
        expect(snapshot.result?.interaction).toMatchObject({
          question: "Which direction?",
        });
        expect(snapshot.result?.interaction).not.toHaveProperty("toolCallId");
        const saved = await ChatTurn.findById(turn._id).lean();
        expect(saved?.interactions[0].toolCallId).toBe("private-tool-id");
      } else if (scenario === "proposal_deadline") {
        expect(await TaskProposal.countDocuments({ turnId: turn._id })).toBe(0);
        expect(snapshot.result?.proposal).toBeUndefined();
      } else if (scenario === "proposal") {
        expect(snapshot.result?.proposal).toMatchObject({
          items: [{ title: "Review streaming" }],
        });
      } else {
        expect(snapshot.result?.response).toBe("Nội dung đang viết");
        const history = await conversationService.get(userId, conversationId);
        expect(
          history?.messages.some(
            (message) => message.text === "Nội dung đang viết",
          ),
        ).toBe(true);
        if (expected !== "completed")
          expect(history?.messages).toContainEqual(
            expect.objectContaining({
              sender: "bot",
              text: "Nội dung đang viết",
              turnStatus: expected,
            }),
          );
      }
    },
  );
});
