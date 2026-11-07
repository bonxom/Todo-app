import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import aiRoutes from "../../routes/aiRoutes.js";
import { errorHandler } from "../../error/errorHandler.js";
import { requestContext } from "../../error/requestContext.js";
import User from "../../models/User.js";
import Category from "../../models/Category.js";
import Stat from "../../models/Stat.js";
import { taskService } from "../taskService.js";
import Task from "../../models/Task.js";
import Conversation from "../../models/Conversation.js";
import ChatTurn from "../../models/ChatTurn.js";
import TaskProposal from "../../models/A2UI/TaskProposal.js";
import TaskProposalReceipt from "../../models/A2UI/TaskProposalReceipt.js";
import { taskProposalRepository } from "../../repositories/A2UI/taskProposalRepository.js";

const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const users = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const secret = "proposal-action-test-only";
const app = express();
app.use(requestContext);
app.use(express.json({ limit: "128kb" }));
app.use("/api/ai", aiRoutes);
app.use(errorHandler);

const token = (index = 0) =>
  `Bearer ${jwt.sign({ id: String(users[index]) }, secret, { expiresIn: "1h" })}`;

const postAction = (
  conversationId: string,
  proposalId: string,
  body: object,
  userIndex = 0,
) =>
  request(app)
    .post(
      `/api/ai/conversations/${conversationId}/proposals/${proposalId}/actions`,
    )
    .set("Authorization", token(userIndex))
    .send(body);

describe.skipIf(!uri)("Task proposal actions real MongoDB integration", () => {
  beforeAll(async () => {
    if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(uri))
      throw new Error("Use disposable loopback MongoDB");
    vi.stubEnv("JWT_SECRET", secret);
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");

    await mongoose.connect(uri, {
      dbName: `orbit_proposal_test_${process.pid}_${Date.now()}`,
    });

    await User.collection.insertMany(
      users.map((_id, index) => ({
        _id,
        role: "USER",
        name: `user-${index}`,
        email: `user-${index}@example.test`,
      })),
    );

    await Category.create(
      users.map((userId) => ({ userId, name: "Uncategorized" })),
    );

    await Conversation.init();
    await ChatTurn.init();
    await taskProposalRepository.initIndexes();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Stat.deleteMany({});
    await Task.deleteMany({});
    await TaskProposal.deleteMany({});
    await TaskProposalReceipt.deleteMany({});
  });

  it("rolls back tasks, stats, proposal and receipt when the second creation fails", async () => {
    const conversationId = randomUUID();
    const proposalId = randomUUID();
    const items = [1, 2].map((n) => ({
      id: randomUUID(),
      title: `Rollback ${n}`,
      priority: "Medium" as const,
    }));
    await TaskProposal.create({
      userId: users[0],
      conversationId,
      turnId: "rollback",
      proposalId,
      revision: 1,
      status: "draft",
      protocolVersion: "v0.9",
      catalogId: "urn:orbit:a2ui:task-proposals:v1",
      items,
      selectedItemIds: items.map((item) => item.id),
      createdTasks: [],
    });
    const original = taskService.create.bind(taskService);
    vi.spyOn(taskService, "create")
      .mockImplementationOnce(original)
      .mockRejectedValueOnce(new Error("Injected second task failure"));
    const response = await postAction(conversationId, proposalId, {
      requestId: randomUUID(),
      revision: 1,
      action: "confirm",
      items,
      selectedItemIds: items.map((item) => item.id),
    });
    expect(response.status).toBe(500);
    expect(await Task.countDocuments()).toBe(0);
    expect(await TaskProposalReceipt.countDocuments()).toBe(0);
    expect(await Stat.countDocuments()).toBe(0);
    expect(await TaskProposal.findOne({ proposalId }).lean()).toMatchObject({
      status: "draft",
      revision: 1,
    });
  });

  it("handles concurrent confirms where only one succeeds and other conflicts", async () => {
    const conversationId = randomUUID();
    const proposalId = randomUUID();
    const item1Id = randomUUID();
    const item2Id = randomUUID();

    await TaskProposal.create({
      userId: users[0],
      conversationId,
      turnId: "turn-concurrent",
      proposalId,
      revision: 1,
      status: "draft",
      protocolVersion: "v0.9",
      catalogId: "urn:orbit:a2ui:task-proposals:v1",
      items: [
        { id: item1Id, title: "Task 1", priority: "High" },
        { id: item2Id, title: "Task 2", priority: "Medium" },
      ],
      selectedItemIds: [item1Id, item2Id],
      createdTasks: [],
    });

    const first = {
      requestId: randomUUID(),
      revision: 1,
      action: "confirm",
      items: [
        { id: item1Id, title: "Task 1", priority: "High" },
        { id: item2Id, title: "Task 2", priority: "Medium" },
      ],
      selectedItemIds: [item1Id, item2Id],
    };

    const second = {
      requestId: randomUUID(),
      revision: 1,
      action: "confirm",
      items: [
        { id: item1Id, title: "Task 1", priority: "High" },
        { id: item2Id, title: "Task 2", priority: "Medium" },
      ],
      selectedItemIds: [item1Id, item2Id],
    };

    const responses = await Promise.all([
      postAction(conversationId, proposalId, first, 0),
      postAction(conversationId, proposalId, second, 0),
    ]);

    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await Task.countDocuments()).toBe(2);
    expect(await Stat.findOne({ userId: users[0] }).lean()).toMatchObject({
      totalTasks: 2,
      inProgressTasks: 2,
    });
  });

  it("replays matching confirmation receipt without duplicating tasks", async () => {
    const conversationId = randomUUID();
    const proposalId = randomUUID();
    const itemId = randomUUID();
    const requestId = randomUUID();

    await TaskProposal.create({
      userId: users[0],
      conversationId,
      turnId: "turn-replay",
      proposalId,
      revision: 1,
      status: "draft",
      protocolVersion: "v0.9",
      catalogId: "urn:orbit:a2ui:task-proposals:v1",
      items: [{ id: itemId, title: "Replay Task", priority: "Medium" }],
      selectedItemIds: [itemId],
      createdTasks: [],
    });

    const action = {
      requestId,
      revision: 1,
      action: "confirm",
      items: [{ id: itemId, title: "Replay Task", priority: "Medium" }],
      selectedItemIds: [itemId],
    };

    // First attempt: should succeed and create 1 task
    const res1 = await postAction(conversationId, proposalId, action, 0);
    expect(res1.status).toBe(200);
    expect(res1.body.data.proposal.status).toBe("created");
    expect(await Task.countDocuments()).toBe(1);

    // Second attempt with exact same requestId and action payload: replays cached receipt
    const res2 = await postAction(conversationId, proposalId, action, 0);
    expect(res2.status).toBe(200);
    expect(res2.body.data.proposal.status).toBe("created");
    expect(res2.body.data.proposal.createdTasks).toEqual(
      res1.body.data.proposal.createdTasks,
    );
    expect(await Task.countDocuments()).toBe(1); // Still exactly 1 task!
  });

  it("rejects reuse of requestId with different payload", async () => {
    const conversationId = randomUUID();
    const proposalId = randomUUID();
    const itemId = randomUUID();
    const requestId = randomUUID();

    await TaskProposal.create({
      userId: users[0],
      conversationId,
      turnId: "turn-conflict",
      proposalId,
      revision: 1,
      status: "draft",
      protocolVersion: "v0.9",
      catalogId: "urn:orbit:a2ui:task-proposals:v1",
      items: [{ id: itemId, title: "Conflict Task", priority: "Medium" }],
      selectedItemIds: [itemId],
      createdTasks: [],
    });

    const action1 = {
      requestId,
      revision: 1,
      action: "confirm",
      items: [{ id: itemId, title: "Conflict Task", priority: "Medium" }],
      selectedItemIds: [itemId],
    };

    const res1 = await postAction(conversationId, proposalId, action1, 0);
    expect(res1.status).toBe(200);

    // Try reusing same requestId with cancel action
    const action2 = {
      requestId,
      revision: 1,
      action: "cancel",
    };

    const res2 = await postAction(conversationId, proposalId, action2, 0);
    expect(res2.status).toBe(409);
  });

  it("preserves composed surface layout across save and confirm actions and isolates layout from unrelated users", async () => {
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "true");
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const specFixture = JSON.parse(
      readFileSync(
        resolve(
          process.cwd(),
          "../frontend/src/test/fixtures/ui-composition-spec.json",
        ),
        "utf-8",
      ),
    );

    const conversationId = randomUUID();
    const proposalId = randomUUID();
    const turnId = `turn-composed-${randomUUID()}`;
    const itemId = randomUUID();
    const savedSurfaceId = randomUUID();

    await ChatTurn.create({
      _id: turnId,
      userId: users[0],
      conversationId,
      requestId: randomUUID(),
      sequence: 1,
      userInput: "Plan IELTS",
      status: "completed",
      mode: "auto",
      proposalId,
      executionToken: "tok",
      interactions: [],
      response: specFixture.proposal.fallbackText,
      messages: [],
      uiSurface: {
        catalogId: "urn:orbit:a2ui:composition:v1",
        surfaceId: savedSurfaceId,
        spec: specFixture.proposal,
      },
      expiresAt: new Date(Date.now() + 60_000),
    });

    await TaskProposal.create({
      userId: users[0],
      conversationId,
      turnId,
      proposalId,
      revision: 1,
      status: "draft",
      protocolVersion: "v0.9",
      catalogId: "urn:orbit:a2ui:task-proposals:v1",
      items: [{ id: itemId, title: "Initial Task", priority: "Medium" }],
      selectedItemIds: [itemId],
      createdTasks: [],
    });

    // Save action preserves composed layout and increments revision
    const saveRes = await postAction(
      conversationId,
      proposalId,
      {
        requestId: randomUUID(),
        revision: 1,
        action: "save",
        items: [{ id: itemId, title: "Edited Task", priority: "High" }],
        selectedItemIds: [itemId],
      },
      0,
    );
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.data.proposal.revision).toBe(2);
    expect(saveRes.body.data.surface).toBeDefined();
    expect(saveRes.body.data.surface.a2ui.surfaceId).toBe(savedSurfaceId);
    expect(saveRes.body.data.surface.a2ui.catalogId).toBe(
      "urn:orbit:a2ui:composition:v1",
    );

    // Unrelated user cannot access action or retrieve layout by proposalId
    const strangerRes = await postAction(
      conversationId,
      proposalId,
      {
        requestId: randomUUID(),
        revision: 2,
        action: "cancel",
      },
      1,
    );
    expect(strangerRes.status).toBe(404);

    // Confirm action preserves composed layout and projects created status; duplicate confirm creates no duplicate tasks
    const confirmReqId = randomUUID();
    const confirmAction = {
      requestId: confirmReqId,
      revision: 2,
      action: "confirm",
      items: [{ id: itemId, title: "Edited Task", priority: "High" }],
      selectedItemIds: [itemId],
    };
    const confirmRes1 = await postAction(
      conversationId,
      proposalId,
      confirmAction,
      0,
    );
    expect(confirmRes1.status).toBe(200);
    expect(confirmRes1.body.data.proposal.status).toBe("created");
    expect(confirmRes1.body.data.surface?.a2ui.surfaceId).toBe(savedSurfaceId);

    const confirmRes2 = await postAction(
      conversationId,
      proposalId,
      confirmAction,
      0,
    );
    expect(confirmRes2.status).toBe(200);
    expect(confirmRes2.body.data.surface?.a2ui.surfaceId).toBe(savedSurfaceId);
    expect(await Task.countDocuments({ title: "Edited Task" })).toBe(1);
  });
});
