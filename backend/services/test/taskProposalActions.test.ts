import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

// Mock writeRepository.transaction to execute callback directly in unit tests
vi.mock("../../mcp/repositories/writeRepository.js", () => ({
  writeRepository: {
    transaction: vi.fn((_userId: string, op: () => Promise<unknown>) => op()),
  },
}));

import { taskProposalActionService } from "../A2UI/taskProposalActionService.js";
import { taskProposalRepository } from "../../repositories/A2UI/taskProposalRepository.js";
import { chatTurnRepository } from "../../repositories/chatTurnRepository.js";
import { taskService } from "../taskService.js";
import { categoryRepository } from "../../repositories/categoryRepository.js";
import { projectRepository } from "../../repositories/projectRepository.js";
import type {
  ITaskProposal,
  ITaskProposalReceipt,
  ProposalAction,
  ProposalItem,
} from "../../types/A2UI/ITaskProposal.js";
import { TASK_PROPOSAL_ERROR } from "../../error/definitions/A2UI/taskProposalErrors.js";
import { AppError } from "../../error/AppError.js";

describe("taskProposalActionService unit tests", () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const conversationId = randomUUID();
  const proposalId = randomUUID();
  const item1Id = randomUUID();
  const item2Id = randomUUID();

  const mockItem1: ProposalItem = {
    id: item1Id,
    title: "Task 1",
    priority: "High",
  };
  const mockItem2: ProposalItem = {
    id: item2Id,
    title: "Task 2",
    priority: "Medium",
  };

  const createMockProposal = (
    overrides?: Partial<ITaskProposal>,
  ): ITaskProposal => ({
    userId: new mongoose.Types.ObjectId(userId) as any,
    conversationId,
    turnId: "turn-123",
    proposalId,
    revision: 1,
    status: "draft",
    protocolVersion: "v0.9",
    catalogId: "urn:orbit:a2ui:task-proposals:v1",
    items: [mockItem1, mockItem2],
    selectedItemIds: [item1Id, item2Id],
    createdTasks: [],
    ...overrides,
  });

  beforeEach(() => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    vi.spyOn(taskProposalRepository, "initIndexes").mockResolvedValue(
      undefined,
    );
    vi.spyOn(chatTurnRepository, "findByProposal").mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects when feature flag is disabled", async () => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "false");
    const action: ProposalAction = {
      requestId: randomUUID(),
      revision: 1,
      action: "cancel",
    };

    await expect(
      taskProposalActionService.apply(
        userId,
        conversationId,
        proposalId,
        action,
      ),
    ).rejects.toMatchObject({
      code: TASK_PROPOSAL_ERROR.DISABLED.code,
      statusCode: 409,
    });
  });

  it("rejects when proposal is not found or owned by another user", async () => {
    vi.spyOn(taskProposalRepository, "findReceipt").mockResolvedValue(null);
    vi.spyOn(taskProposalRepository, "findOwned").mockResolvedValue(null);

    const action: ProposalAction = {
      requestId: randomUUID(),
      revision: 1,
      action: "cancel",
    };

    await expect(
      taskProposalActionService.apply(
        userId,
        conversationId,
        proposalId,
        action,
      ),
    ).rejects.toMatchObject({
      code: TASK_PROPOSAL_ERROR.NOT_FOUND.code,
      statusCode: 404,
    });
  });

  it("replays matching receipt without re-executing action", async () => {
    const requestId = randomUUID();
    const action: ProposalAction = {
      requestId,
      revision: 1,
      action: "cancel",
    };

    const cachedView = {
      id: proposalId,
      conversationId,
      turnId: "turn-123",
      revision: 2,
      status: "cancelled" as const,
      protocolVersion: "v0.9" as const,
      catalogId: "urn:orbit:a2ui:task-proposals:v1" as const,
      items: [mockItem1, mockItem2],
      selectedItemIds: [],
      createdTasks: [],
    };

    const fingerprint = taskProposalActionService.computeFingerprint(
      proposalId,
      conversationId,
      action,
    );

    const mockReceipt: ITaskProposalReceipt = {
      userId: new mongoose.Types.ObjectId(userId) as any,
      requestId,
      proposalId,
      payloadFingerprint: fingerprint,
      responseView: cachedView,
    };

    vi.spyOn(taskProposalRepository, "findReceipt").mockResolvedValue(
      mockReceipt,
    );
    const saveRevisionSpy = vi.spyOn(taskProposalRepository, "saveRevision");
    const taskCreateSpy = vi.spyOn(taskService, "create");

    const result = await taskProposalActionService.apply(
      userId,
      conversationId,
      proposalId,
      action,
    );

    expect(result).toEqual(cachedView);
    expect(saveRevisionSpy).not.toHaveBeenCalled();
    expect(taskCreateSpy).not.toHaveBeenCalled();
  });

  it("rejects request reusing existing requestId with different payload", async () => {
    const requestId = randomUUID();
    const action: ProposalAction = {
      requestId,
      revision: 1,
      action: "cancel",
    };

    const mockReceipt: ITaskProposalReceipt = {
      userId: new mongoose.Types.ObjectId(userId) as any,
      requestId,
      proposalId,
      payloadFingerprint: "different-hash",
      responseView: {} as any,
    };

    vi.spyOn(taskProposalRepository, "findReceipt").mockResolvedValue(
      mockReceipt,
    );

    await expect(
      taskProposalActionService.apply(
        userId,
        conversationId,
        proposalId,
        action,
      ),
    ).rejects.toMatchObject({
      code: TASK_PROPOSAL_ERROR.REQUEST_CONFLICT.code,
      statusCode: 409,
    });
  });

  it("rejects stale revision", async () => {
    vi.spyOn(taskProposalRepository, "findReceipt").mockResolvedValue(null);
    vi.spyOn(taskProposalRepository, "findOwned").mockResolvedValue(
      createMockProposal({ revision: 2 }),
    );

    const action: ProposalAction = {
      requestId: randomUUID(),
      revision: 1, // stale
      action: "cancel",
    };

    await expect(
      taskProposalActionService.apply(
        userId,
        conversationId,
        proposalId,
        action,
      ),
    ).rejects.toMatchObject({
      code: TASK_PROPOSAL_ERROR.REVISION_CONFLICT.code,
      statusCode: 409,
    });
  });

  it("rejects action on non-draft proposal", async () => {
    vi.spyOn(taskProposalRepository, "findReceipt").mockResolvedValue(null);
    vi.spyOn(taskProposalRepository, "findOwned").mockResolvedValue(
      createMockProposal({ status: "created", revision: 1 }),
    );

    const action: ProposalAction = {
      requestId: randomUUID(),
      revision: 1,
      action: "cancel",
    };

    await expect(
      taskProposalActionService.apply(
        userId,
        conversationId,
        proposalId,
        action,
      ),
    ).rejects.toMatchObject({
      code: TASK_PROPOSAL_ERROR.REVISION_CONFLICT.code,
      statusCode: 409,
    });
  });

  it("cancels draft proposal without creating any tasks", async () => {
    const proposal = createMockProposal();
    vi.spyOn(taskProposalRepository, "findReceipt").mockResolvedValue(null);
    vi.spyOn(taskProposalRepository, "findOwned").mockResolvedValue(proposal);
    const saveRevisionSpy = vi
      .spyOn(taskProposalRepository, "saveRevision")
      .mockResolvedValue({
        ...proposal,
        revision: 2,
        status: "cancelled",
      });
    const saveReceiptSpy = vi
      .spyOn(taskProposalRepository, "saveReceipt")
      .mockResolvedValue({} as any);
    const taskCreateSpy = vi.spyOn(taskService, "create");

    const action: ProposalAction = {
      requestId: randomUUID(),
      revision: 1,
      action: "cancel",
    };

    const result = await taskProposalActionService.apply(
      userId,
      conversationId,
      proposalId,
      action,
    );

    expect(result.status).toBe("cancelled");
    expect(result.revision).toBe(2);
    expect(taskCreateSpy).not.toHaveBeenCalled();
    expect(saveRevisionSpy).toHaveBeenCalledWith(
      userId,
      conversationId,
      proposalId,
      1,
      expect.objectContaining({ status: "cancelled" }),
    );
    expect(saveReceiptSpy).toHaveBeenCalled();
  });

  it("saves edited draft proposal without creating any tasks", async () => {
    const proposal = createMockProposal();
    vi.spyOn(taskProposalRepository, "findReceipt").mockResolvedValue(null);
    vi.spyOn(taskProposalRepository, "findOwned").mockResolvedValue(proposal);
    vi.spyOn(categoryRepository, "findByUser").mockResolvedValue([]);

    const editedItem1 = { ...mockItem1, title: "Updated Task 1" };
    const editedItems = [editedItem1, mockItem2];

    const saveRevisionSpy = vi
      .spyOn(taskProposalRepository, "saveRevision")
      .mockResolvedValue({
        ...proposal,
        revision: 2,
        status: "draft",
        items: editedItems,
        selectedItemIds: [item1Id],
      });
    const saveReceiptSpy = vi
      .spyOn(taskProposalRepository, "saveReceipt")
      .mockResolvedValue({} as any);
    const taskCreateSpy = vi.spyOn(taskService, "create");

    const action: ProposalAction = {
      requestId: randomUUID(),
      revision: 1,
      action: "save",
      items: editedItems,
      selectedItemIds: [item1Id],
    };

    const result = await taskProposalActionService.apply(
      userId,
      conversationId,
      proposalId,
      action,
    );

    expect(result.status).toBe("draft");
    expect(result.revision).toBe(2);
    expect(result.items[0].title).toBe("Updated Task 1");
    expect(result.selectedItemIds).toEqual([item1Id]);
    expect(taskCreateSpy).not.toHaveBeenCalled();
    expect(saveRevisionSpy).toHaveBeenCalled();
    expect(saveReceiptSpy).toHaveBeenCalled();
  });

  it("confirms subset selection and creates tasks only for selected items", async () => {
    const proposal = createMockProposal();
    vi.spyOn(taskProposalRepository, "findReceipt").mockResolvedValue(null);
    vi.spyOn(taskProposalRepository, "findOwned").mockResolvedValue(proposal);
    vi.spyOn(categoryRepository, "findByUser").mockResolvedValue([]);

    const createdTaskId = new mongoose.Types.ObjectId().toString();
    const taskCreateSpy = vi
      .spyOn(taskService, "create")
      .mockResolvedValue({ _id: createdTaskId, title: mockItem1.title } as any);

    const saveRevisionSpy = vi
      .spyOn(taskProposalRepository, "saveRevision")
      .mockImplementation(async (_u, _c, _p, _r, update) => ({
        ...proposal,
        revision: 2,
        status: update.status as any,
        items: update.items as any,
        selectedItemIds: update.selectedItemIds as any,
        createdTasks: update.createdTasks as any,
      }));
    const saveReceiptSpy = vi
      .spyOn(taskProposalRepository, "saveReceipt")
      .mockResolvedValue({} as any);

    const action: ProposalAction = {
      requestId: randomUUID(),
      revision: 1,
      action: "confirm",
      items: [mockItem1, mockItem2],
      selectedItemIds: [item1Id], // Only item 1 selected!
    };

    const result = await taskProposalActionService.apply(
      userId,
      conversationId,
      proposalId,
      action,
    );

    expect(result.status).toBe("created");
    expect(result.revision).toBe(2);
    expect(taskCreateSpy).toHaveBeenCalledTimes(1);
    expect(taskCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Task 1" }),
      userId,
    );
    expect(result.createdTasks).toEqual([
      { itemId: item1Id, taskId: createdTaskId, title: "Task 1" },
    ]);
    expect(saveRevisionSpy).toHaveBeenCalled();
    expect(saveReceiptSpy).toHaveBeenCalled();
  });

  it("rejects if referenced project is completed", async () => {
    const proposal = createMockProposal();
    const projectId = new mongoose.Types.ObjectId().toString();
    vi.spyOn(taskProposalRepository, "findReceipt").mockResolvedValue(null);
    vi.spyOn(taskProposalRepository, "findOwned").mockResolvedValue(proposal);
    vi.spyOn(categoryRepository, "findByUser").mockResolvedValue([]);
    vi.spyOn(projectRepository, "findById").mockResolvedValue({
      _id: projectId,
      userId,
      status: "completed",
    } as any);

    const action: ProposalAction = {
      requestId: randomUUID(),
      revision: 1,
      action: "confirm",
      items: [{ ...mockItem1, projectId }, mockItem2],
      selectedItemIds: [item1Id],
    };

    await expect(
      taskProposalActionService.apply(
        userId,
        conversationId,
        proposalId,
        action,
      ),
    ).rejects.toMatchObject({
      code: TASK_PROPOSAL_ERROR.INVALID_REFERENCE.code,
      statusCode: 422,
    });
  });

  it("rejects if item set does not match stored proposal item IDs", async () => {
    const proposal = createMockProposal();
    vi.spyOn(taskProposalRepository, "findReceipt").mockResolvedValue(null);
    vi.spyOn(taskProposalRepository, "findOwned").mockResolvedValue(proposal);

    const unknownId = randomUUID();
    const action: ProposalAction = {
      requestId: randomUUID(),
      revision: 1,
      action: "save",
      items: [{ id: unknownId, title: "Hacked Item" }, mockItem2],
      selectedItemIds: [unknownId],
    };

    await expect(
      taskProposalActionService.apply(
        userId,
        conversationId,
        proposalId,
        action,
      ),
    ).rejects.toMatchObject({
      code: TASK_PROPOSAL_ERROR.INVALID_REFERENCE.code,
      statusCode: 422,
    });
  });
});

import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import aiRoutes from "../../routes/aiRoutes.js";
import { errorHandler } from "../../error/errorHandler.js";
import { requestContext } from "../../error/requestContext.js";
import User from "../../models/User.js";

describe("POST /api/ai/conversations/:conversationId/proposals/:proposalId/actions HTTP route", () => {
  const secret = "test-action-secret";
  const userId = new mongoose.Types.ObjectId().toString();
  const validConvId = randomUUID();
  const validPropId = randomUUID();

  const app = express();
  app.use(requestContext);
  app.use(express.json());
  app.use("/api/ai", aiRoutes);
  app.use(errorHandler);

  const token = `Bearer ${jwt.sign({ id: userId }, secret, { expiresIn: "1h" })}`;

  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", secret);
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    vi.spyOn(taskProposalRepository, "initIndexes").mockResolvedValue(
      undefined,
    );
    vi.spyOn(chatTurnRepository, "findByProposal").mockResolvedValue(null);
    vi.spyOn(User, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(userId),
        role: "USER",
      }),
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app)
      .post(
        `/api/ai/conversations/${validConvId}/proposals/${validPropId}/actions`,
      )
      .send({ action: "cancel", revision: 1, requestId: randomUUID() });

    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid UUID params", async () => {
    const res = await request(app)
      .post(`/api/ai/conversations/invalid-id/proposals/${validPropId}/actions`)
      .set("Authorization", token)
      .send({ action: "cancel", revision: 1, requestId: randomUUID() });

    expect(res.status).toBe(400);
  });

  it("returns 413 on oversized payload > 128 KiB", async () => {
    const largeDesc = "x".repeat(130 * 1024);
    const res = await request(app)
      .post(
        `/api/ai/conversations/${validConvId}/proposals/${validPropId}/actions`,
      )
      .set("Authorization", token)
      .send({
        action: "save",
        revision: 1,
        requestId: randomUUID(),
        items: [{ id: randomUUID(), title: "Large", description: largeDesc }],
        selectedItemIds: [],
      });

    expect(res.status).toBe(413);
  });

  it("returns 200 on valid action and delegates to taskProposalActionService", async () => {
    const mockView = {
      id: validPropId,
      conversationId: validConvId,
      turnId: "turn-1",
      revision: 2,
      status: "cancelled" as const,
      protocolVersion: "v0.9" as const,
      catalogId: "urn:orbit:a2ui:task-proposals:v1" as const,
      items: [{ id: randomUUID(), title: "Task 1", priority: "High" as const }],
      selectedItemIds: [],
      createdTasks: [],
    };

    const applySpy = vi
      .spyOn(taskProposalActionService, "apply")
      .mockResolvedValue(mockView);

    const actionReqId = randomUUID();
    const res = await request(app)
      .post(
        `/api/ai/conversations/${validConvId}/proposals/${validPropId}/actions`,
      )
      .set("Authorization", token)
      .send({ action: "cancel", revision: 1, requestId: actionReqId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.proposal).toEqual(mockView);
    expect(res.body.data.text).toContain("Đề xuất công việc đã được hủy.");
    expect(applySpy).toHaveBeenCalledWith(
      userId,
      validConvId,
      validPropId,
      expect.objectContaining({
        action: "cancel",
        revision: 1,
        requestId: actionReqId,
      }),
    );
  });
});
