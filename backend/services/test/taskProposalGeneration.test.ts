import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

const completionCreate = vi.hoisted(() => vi.fn());

vi.mock("../../libs/aiClient.js", () => ({
  getAiClient: () => ({
    chat: { completions: { create: completionCreate } },
  }),
}));

vi.mock("../../config/env.js", () => ({
  getAiModel: () => "test-model",
}));

import { agentService } from "../agentService.js";
import { taskWriteService } from "../../mcp/services/taskWriteService.js";
import { categoryService } from "../categoryService.js";
import { projectRepository } from "../../repositories/projectRepository.js";
import { categoryRepository } from "../../repositories/categoryRepository.js";
import { taskProposalGenerationService } from "../A2UI/taskProposalGenerationService.js";
import type { McpContext } from "../../mcp/context.js";
import { TASK_PROPOSAL_ERROR } from "../../error/definitions/A2UI/taskProposalErrors.js";
import { resultFor, turnMessages } from "../../utils/conversationView.js";
import type { ChatTurn } from "../../types/IChatTurn.js";
import type { ProposalView } from "../../types/A2UI/ITaskProposal.js";

const userId = new Types.ObjectId("507f1f77bcf86cd799439011");
const defaultCatId = new Types.ObjectId("507f1f77bcf86cd799439012");
const testContext = {
  user: { _id: userId, role: "USER" },
  scopes: ["tasks:write"],
  requestId: "proposal-test-req",
} as unknown as McpContext;

const call = (id: string, name: string, args: unknown) => ({
  id,
  type: "function" as const,
  function: { name, arguments: JSON.stringify(args) },
});

const response = (...calls: unknown[]) => ({
  choices: [
    { message: { role: "assistant", content: null, tool_calls: calls } },
  ],
});

describe("Task Proposal Generation & Protection", () => {
  beforeEach(() => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    completionCreate.mockReset();
  });

  describe("taskProposalGenerationService.prepare", () => {
    it("assigns server UUIDs and resolves default category when missing", async () => {
      vi.spyOn(categoryRepository, "findByUser").mockResolvedValue([
        { _id: defaultCatId, name: "Uncategorized", userId } as never,
      ]);
      vi.spyOn(projectRepository, "findById").mockResolvedValue(null);

      const items = [
        {
          title: "Study TypeScript",
          description: "Read handbook",
          priority: "High" as const,
        },
      ];

      const prepared = await taskProposalGenerationService.prepare(
        items,
        testContext,
      );

      expect(prepared).toHaveLength(1);
      expect(prepared[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(prepared[0].title).toBe("Study TypeScript");
      expect(prepared[0].categoryId).toBe(String(defaultCatId));
      expect(prepared[0].projectId).toBeNull();
    });

    it("rejects completed project assignments", async () => {
      const projId = new Types.ObjectId("507f1f77bcf86cd799439013");
      vi.spyOn(categoryRepository, "findByUser").mockResolvedValue([
        { _id: defaultCatId, name: "Uncategorized", userId } as never,
      ]);
      vi.spyOn(projectRepository, "findById").mockResolvedValue({
        _id: projId,
        userId,
        status: "completed",
      } as never);

      const items = [
        {
          title: "Done project task",
          projectId: String(projId),
        },
      ];

      await expect(
        taskProposalGenerationService.prepare(items, testContext),
      ).rejects.toMatchObject({
        code: TASK_PROPOSAL_ERROR.INVALID_REFERENCE.code,
      });
    });

    it.each(["2026-02-30", "2026-13-01", "not-a-date"])(
      "rejects invalid model dates before normalization: %s",
      async (dueDate) => {
        vi.spyOn(categoryRepository, "findByUser").mockResolvedValue([
          { _id: defaultCatId, name: "Uncategorized", userId } as never,
        ]);
        await expect(
          taskProposalGenerationService.prepare(
            [{ title: "Read", dueDate }],
            testContext,
          ),
        ).rejects.toThrow();
      },
    );
    it("does not substitute the first category when Uncategorized is missing", async () => {
      vi.spyOn(categoryRepository, "findByUser").mockResolvedValue([
        { _id: defaultCatId, name: "Work", userId } as never,
      ]);
      await expect(
        taskProposalGenerationService.prepare([{ title: "Read" }], testContext),
      ).rejects.toThrow();
    });
    it("does not silently replace a foreign category", async () => {
      vi.spyOn(categoryRepository, "findByUser").mockResolvedValue([
        { _id: defaultCatId, name: "Uncategorized", userId } as never,
      ]);
      await expect(
        taskProposalGenerationService.prepare(
          [{ title: "Read", categoryId: "507f1f77bcf86cd799439099" }],
          testContext,
        ),
      ).rejects.toMatchObject({
        code: TASK_PROPOSAL_ERROR.INVALID_REFERENCE.code,
      });
    });
    it("preserves owned active project assignments", async () => {
      const projId = new Types.ObjectId("507f1f77bcf86cd799439014");
      vi.spyOn(categoryRepository, "findByUser").mockResolvedValue([
        { _id: defaultCatId, name: "Uncategorized", userId } as never,
      ]);
      vi.spyOn(projectRepository, "findById").mockResolvedValue({
        _id: projId,
        userId,
        status: "active",
      } as never);

      const items = [
        {
          title: "Active project task",
          projectId: String(projId),
        },
      ];

      const prepared = await taskProposalGenerationService.prepare(
        items,
        testContext,
      );
      expect(prepared[0].projectId).toBe(String(projId));
    });
  });

  describe("Agent write protection in proposal mode", () => {
    it("prohibits MCP write tools when intent is task_proposal and completes via propose_tasks", async () => {
      const writeSpy = vi.spyOn(taskWriteService, "create");
      vi.spyOn(categoryService, "getAll").mockResolvedValue([]);

      // Model first attempts to call orbit_create_task, then after rejection calls propose_tasks
      completionCreate
        .mockResolvedValueOnce(
          response(
            call("call-bad", "orbit_create_task", {
              title: "Read chapter 1",
              categoryId: String(defaultCatId),
              idempotencyKey: "1234567890abcdef",
            }),
          ),
        )
        .mockResolvedValueOnce(
          response(
            call("call-good", "propose_tasks", {
              items: [
                {
                  title: "Read chapter 1",
                  priority: "High",
                },
              ],
            }),
          ),
        );

      const result = await agentService.chatWithMcp(
        "Plan my reading",
        testContext,
        {
          intent: "task_proposal",
        },
      );

      expect(writeSpy).not.toHaveBeenCalled();
      expect(typeof result).toBe("object");
      expect(
        typeof result !== "string" &&
          typeof result !== "string" &&
          "proposalItems" in result,
      ).toBe(true);
      if (
        typeof result !== "string" &&
        typeof result !== "string" &&
        "proposalItems" in result
      ) {
        expect(result.proposalItems).toHaveLength(1);
        expect(result.proposalItems[0].title).toBe("Read chapter 1");
      }
    });

    it("preserves legacy direct creation when A2UI is explicitly disabled", async () => {
      vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "false");
      const writeSpy = vi.spyOn(taskWriteService, "create").mockResolvedValue({
        task: { _id: "507f1f77bcf86cd799439099", title: "Ordinary task" },
      } as never);
      vi.spyOn(categoryService, "getAll").mockResolvedValue([]);

      completionCreate
        .mockResolvedValueOnce(
          response(
            call("call-write", "orbit_create_task", {
              title: "Ordinary task",
              categoryId: String(defaultCatId),
              idempotencyKey: "1234567890abcdef",
            }),
          ),
        )
        .mockResolvedValueOnce({
          choices: [
            { message: { role: "assistant", content: "Created task." } },
          ],
        });

      const result = await agentService.chatWithMcp(
        "Create task Ordinary task",
        testContext,
      );

      expect(writeSpy).toHaveBeenCalledTimes(1);
      expect(result).toBe("Created task.");
    });
  });

  describe("Proposal envelope view hydration", () => {
    const mockProposalView: ProposalView = {
      id: "00000000-0000-4000-8000-000000000001",
      conversationId: "11111111-1111-4111-8111-111111111111",
      turnId: "turn-1",
      revision: 1,
      status: "draft",
      protocolVersion: "v0.9",
      catalogId: "urn:orbit:a2ui:task-proposals:v1",
      items: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          title: "Read chapter 1",
        },
      ],
      selectedItemIds: ["00000000-0000-4000-8000-000000000002"],
      createdTasks: [],
    };

    const mockTurn: ChatTurn = {
      _id: "turn-1",
      conversationId: "11111111-1111-4111-8111-111111111111",
      userId,
      requestId: "req-1",
      sequence: 1,
      userInput: "Plan my tasks",
      status: "completed",
      mode: "auto",
      executionToken: "token-1",
      interactions: [],
      response: "Here is your proposal",
      messages: [],
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date("2026-11-04T10:00:00.000Z"),
      updatedAt: new Date("2026-11-04T10:00:05.000Z"),
    };

    it("resultFor attaches proposal when envelope provided", () => {
      const res = resultFor(mockTurn, { proposal: mockProposalView });
      expect(res.proposal).toEqual(mockProposalView);
    });

    it("turnMessages attaches proposal to the bot message", () => {
      const messages = turnMessages(mockTurn, { proposal: mockProposalView });
      expect(messages).toHaveLength(2);
      expect(messages[1].sender).toBe("bot");
      expect(messages[1]).toMatchObject({ proposal: mockProposalView });
    });
  });
});
