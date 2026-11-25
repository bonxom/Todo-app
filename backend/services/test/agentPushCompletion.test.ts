import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Conversation from "../../models/Conversation.js";
import { chatStreamRepository } from "../../repositories/chatStreamRepository.js";
import { pushDispatchService } from "../pushDispatchService.js";
import { agentService } from "../agentService.js";
import { taskProposalGenerationService } from "../A2UI/taskProposalGenerationService.js";
import { taskProposalRepository } from "../../repositories/A2UI/taskProposalRepository.js";
import { chatTurnRepository } from "../../repositories/chatTurnRepository.js";
import { uiPresentationService } from "../A2UI/uiPresentationService.js";
import { runConversationTurn } from "../conversationTurnService.js";
import type { ChatTurn } from "../../types/IChatTurn.js";
import type { IUserDocument } from "../../types/IUser.js";

describe("Agent completion Web Push hooks", () => {
  const originalEnv = { ...process.env };
  const userId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    process.env.VAPID_PUBLIC_KEY = "test-public-key";
    process.env.VAPID_PRIVATE_KEY = "test-private-key";
    process.env.VAPID_SUBJECT = "mailto:test@orbit.local";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    chatStreamRepository._resetPushDedupForTest?.();
  });

  it("dispatches notifyAgentReply once on completed turns and skips duplicates", async () => {
    vi.spyOn(Conversation, "findById").mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "conv-1",
          userId,
          title: "Roadmap chat",
        }),
      }),
    } as never);

    const notifySpy = vi
      .spyOn(pushDispatchService, "notifyAgentReply")
      .mockResolvedValue({ sent: 1, removed: 0, failed: 0 });

    const snapshot = {
      turnId: "turn-complete-1",
      conversationId: "conv-1",
      requestId: "req-1",
      status: "completed" as const,
      partialResponse: "Done!",
      lastEventSeq: 2,
      toolProgress: [],
      deadlineAt: new Date().toISOString(),
    };

    chatStreamRepository.postFinishNotification(
      "turn-complete-1",
      {
        status: "completed",
        result: {
          conversationId: "conv-1",
          status: "completed",
          response: "Done!",
        },
      },
      snapshot,
    );

    // Duplicate notification for the same turnId should be ignored
    chatStreamRepository.postFinishNotification(
      "turn-complete-1",
      {
        status: "completed",
        result: {
          conversationId: "conv-1",
          status: "completed",
          response: "Done!",
        },
      },
      snapshot,
    );

    await vi.waitFor(() => {
      expect(notifySpy).toHaveBeenCalledTimes(1);
    });
    expect(notifySpy).toHaveBeenCalledWith({
      userId: userId.toString(),
      conversationId: "conv-1",
      conversationTitle: "Roadmap chat",
    });
  });

  it.each(["cancelled", "failed", "timed_out", "interrupted"] as const)(
    "does not dispatch notifyAgentReply when turn finishes with status %s",
    async (status) => {
      const findConvSpy = vi.spyOn(Conversation, "findById");
      const notifySpy = vi.spyOn(pushDispatchService, "notifyAgentReply");

      chatStreamRepository.postFinishNotification(
        `turn-${status}`,
        {
          status,
          result: {
            conversationId: "conv-2",
            status,
            response: "",
          },
        },
        {
          turnId: `turn-${status}`,
          conversationId: "conv-2",
          requestId: `req-${status}`,
          status,
          partialResponse: "",
          lastEventSeq: 1,
          toolProgress: [],
          deadlineAt: new Date().toISOString(),
        },
      );

      await Promise.resolve();
      expect(findConvSpy).not.toHaveBeenCalled();
      expect(notifySpy).not.toHaveBeenCalled();
    },
  );

  it("triggers push notification on completed proposal turn finalization", async () => {
    vi.spyOn(Conversation, "findById").mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: "conv-prop-1",
          userId,
          title: "Plan Q4 launch",
        }),
      }),
    } as never);

    const notifySpy = vi
      .spyOn(pushDispatchService, "notifyAgentReply")
      .mockResolvedValue({ sent: 1, removed: 0, failed: 0 });

    vi.spyOn(chatTurnRepository, "turns").mockResolvedValue([]);
    vi.spyOn(taskProposalRepository, "findRecentConfirmed").mockResolvedValue(
      [],
    );
    vi.spyOn(taskProposalRepository, "findRecentCancelled").mockResolvedValue(
      [],
    );

    vi.spyOn(agentService, "chatWithMcp").mockResolvedValue({
      proposalItems: [
        {
          tempId: "item-1",
          title: "Draft launch post",
          priority: "high",
          status: "pending",
        },
      ],
      companionText: "I drafted a task proposal.",
      messages: [],
      activities: [],
      skillsRead: [],
    } as never);

    vi.spyOn(taskProposalGenerationService, "prepare").mockResolvedValue([
      {
        id: "item-1",
        title: "Draft launch post",
        priority: "high",
        status: "pending",
      },
    ] as never);

    vi.spyOn(uiPresentationService, "forTurn").mockReturnValue({
      text: "I drafted a task proposal.",
      surface: null,
      proposal: null,
      a2ui: undefined,
      companionText: "I drafted a task proposal.",
    } as never);

    vi.spyOn(chatTurnRepository, "finishWithProposal").mockResolvedValue({
      proposalId: "prop-1",
      revision: 1,
      status: "draft",
      items: [],
      selectedItemIds: [],
      createdTasks: [],
    } as never);

    const turn: ChatTurn = {
      _id: "turn-prop-1",
      conversationId: "conv-prop-1",
      userId,
      requestId: "req-prop-1",
      sequence: 1,
      userInput: "Help plan Q4 launch",
      status: "processing",
      mode: "auto",
      executionToken: "exec-prop-1",
      messages: [{ role: "user", content: "Help plan Q4 launch" }],
      interactions: [],
      response: "",
      expiresAt: new Date(Date.now() + 300_000),
      deadlineAt: new Date(Date.now() + 300_000),
      lastEventSeq: 0,
      partialResponse: "",
      toolProgress: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const controller = new AbortController();
    await runConversationTurn(
      turn,
      {
        user: { _id: userId, role: "USER" } as unknown as IUserDocument,
        requestId: "req-prop-1",
      },
      undefined,
      {
        signal: controller.signal,
        deadlineAt: new Date(Date.now() + 300_000),
        emit: vi.fn().mockResolvedValue(undefined),
      },
    );

    await vi.waitFor(() => {
      expect(notifySpy).toHaveBeenCalledTimes(1);
    });
    expect(notifySpy).toHaveBeenCalledWith({
      userId: userId.toString(),
      conversationId: "conv-prop-1",
      conversationTitle: "Plan Q4 launch",
    });
  });
});
