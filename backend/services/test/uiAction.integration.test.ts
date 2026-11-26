import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { taskWriteService } from "../../mcp/services/taskWriteService.js";
import Category from "../../models/Category.js";
import ChatTurn from "../../models/ChatTurn.js";
import Conversation from "../../models/Conversation.js";
import Stat from "../../models/Stat.js";
import Task from "../../models/Task.js";
import User from "../../models/User.js";
import { McpWriteReceipt } from "../../repositories/taskCommandRepository.js";
import type { IUserDocument } from "../../types/IUser.js";
import { interactiveUiService } from "../A2UI/interactiveUiService.js";
import { uiActionService } from "../A2UI/uiActionService.js";
import { conversationService } from "../conversationService.js";
import { statService } from "../statService.js";

const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const dbName = `orbit_ui_action_test_${process.pid}_${Date.now()}`;
const oid = () => new mongoose.Types.ObjectId();
const userA = { _id: oid(), role: "USER" } as IUserDocument;
const userB = { _id: oid(), role: "USER" } as IUserDocument;
const catA = oid();
const catB = oid();

describe.skipIf(!uri)("uiActionService MongoDB replica-set integration", () => {
  beforeAll(async () => {
    if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(uri)) {
      throw new Error("Use a disposable loopback MongoDB URI ending in /");
    }
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
    await User.collection.insertMany(
      [userA, userB].map((u, i) => ({
        _id: u._id,
        role: u.role,
        name: `ui-action-${i}`,
        email: `ui-action-${i}@example.test`,
      })),
    );
    await Category.create([
      { _id: catA, userId: userA._id, name: "Uncategorized" },
      { _id: catB, userId: userB._id, name: "Uncategorized" },
    ]);
    await Promise.all([
      Task.init(),
      Stat.init(),
      Conversation.init(),
      ChatTurn.init(),
      McpWriteReceipt.init(),
    ]);
  });

  beforeEach(() => {
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "true");
    vi.stubEnv("A2UI_INTERACTIVE_ENABLED", "true");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  async function seedTurnWithTask(
    owner: IUserDocument,
    categoryId: mongoose.Types.ObjectId,
    status: "pending" | "in-progress" | "completed" | "given-up",
    turnStatus: "completed" | "processing" = "completed",
  ) {
    const task = await Task.create({
      title: `Task ${status}`,
      categoryId,
      status,
    });
    const storedSurface = await interactiveUiService.prepare(
      {
        fallbackText: `Complete ${task.title}`,
        components: [
          {
            id: "root",
            component: "Button",
            label: "Hoàn thành",
            actionKey: "finishTask",
          },
        ],
        displayData: {},
        actions: {
          finishTask: { name: "task.complete", taskId: String(task._id) },
        },
      },
      owner,
    );
    const conversationId = randomUUID();
    const turnId = randomUUID();
    await Conversation.create({
      _id: conversationId,
      userId: owner._id,
      title: "Action integration",
      sequence: 1,
    });
    await ChatTurn.create({
      _id: turnId,
      conversationId,
      userId: owner._id,
      requestId: randomUUID(),
      sequence: 1,
      userInput: "Cho nút hoàn thành",
      status: turnStatus,
      mode: "auto",
      executionToken: randomUUID(),
      interactions: [],
      response: storedSurface.spec.fallbackText,
      uiSurface: storedSurface,
      messages: [],
      activities: [],
      expiresAt: new Date(Date.now() + 60_000),
    });

    return {
      task,
      conversationId,
      turnId,
      surfaceId: storedSurface.surfaceId,
      actionId: storedSurface.actionBindings[0].id,
      location: {
        conversationId,
        turnId,
        surfaceId: storedSurface.surfaceId,
      },
    };
  }

  it("completes an owned in-progress task, updates stats, replays idempotently, and prevents origin/key reuse", async () => {
    const seeded = await seedTurnWithTask(userA, catA, "in-progress");
    const statsBefore = await statService.getStats(userA);
    const requestId = randomUUID();

    const first = await uiActionService.execute(
      seeded.location,
      { requestId, actionId: seeded.actionId },
      userA,
    );
    expect(first.outcome).toBe("succeeded");
    expect(first.task.status).toBe("completed");
    expect(first.task.completedAt).not.toBeNull();

    const dbTask = await Task.findById(seeded.task._id);
    expect(dbTask?.status).toBe("completed");
    expect(dbTask?.completedAt).not.toBeNull();

    const statsAfter = await statService.getStats(userA);
    expect(statsAfter.completedTasks).toBe(statsBefore.completedTasks + 1);

    // Same-request replay returns exact saved result without updating completedAt or stats
    const replay = await uiActionService.execute(
      seeded.location,
      { requestId, actionId: seeded.actionId },
      userA,
    );
    expect(replay).toEqual(first);
    expect((await statService.getStats(userA)).completedTasks).toBe(
      statsAfter.completedTasks,
    );

    // Reusing requestId on another turn/surface conflicts (409)
    const other = await seedTurnWithTask(userA, catA, "in-progress");
    await expect(
      uiActionService.execute(
        other.location,
        { requestId, actionId: other.actionId },
        userA,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    // Completing an already completed task with a new requestId is a safe no-op
    const noop = await uiActionService.execute(
      seeded.location,
      { requestId: randomUUID(), actionId: seeded.actionId },
      userA,
    );
    expect(noop.task.completedAt).toBe(first.task.completedAt);
    expect((await statService.getStats(userA)).completedTasks).toBe(
      statsAfter.completedTasks,
    );
  });

  it("deduplicates concurrent dispatches and concurrent MCP completion without double-counting stats", async () => {
    const seeded = await seedTurnWithTask(userA, catA, "in-progress");
    const statsBefore = await statService.getStats(userA);
    const sharedReqId = randomUUID();

    const [r1, r2] = await Promise.all([
      uiActionService.execute(
        seeded.location,
        { requestId: sharedReqId, actionId: seeded.actionId },
        userA,
      ),
      uiActionService.execute(
        seeded.location,
        { requestId: sharedReqId, actionId: seeded.actionId },
        userA,
      ),
    ]);
    expect(r1).toEqual(r2);
    expect(
      await McpWriteReceipt.countDocuments({ taskId: String(seeded.task._id) }),
    ).toBe(1);

    // Concurrent A2UI + MCP on another in-progress task
    const seeded2 = await seedTurnWithTask(userA, catA, "in-progress");
    const [uiRes, mcpRes] = await Promise.all([
      uiActionService.execute(
        seeded2.location,
        { requestId: randomUUID(), actionId: seeded2.actionId },
        userA,
      ),
      taskWriteService.update(
        {
          taskId: String(seeded2.task._id),
          changes: { status: "completed" },
          idempotencyKey: randomUUID(),
        },
        { user: userA, scopes: ["tasks:write"], requestId: randomUUID() },
      ),
    ]);
    expect(uiRes.task.status).toBe("completed");
    expect(mcpRes.task.status).toBe("completed");
    expect(uiRes.task.completedAt).toBe(mcpRes.task.completedAt);

    const statsAfter = await statService.getStats(userA);
    expect(statsAfter.completedTasks).toBe(statsBefore.completedTasks + 2);
  });

  it("rechecks task ownership after presentation, blocks pending/given-up, and rolls back receipt failures", async () => {
    const seeded = await seedTurnWithTask(userA, catA, "in-progress");
    // Reassign task to userB after presentation
    await Task.updateOne(
      { _id: seeded.task._id },
      { $set: { categoryId: catB } },
    );
    await expect(
      uiActionService.execute(
        seeded.location,
        { requestId: randomUUID(), actionId: seeded.actionId },
        userA,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });

    // Pending and given-up tasks return 422 and never get started/completed
    for (const status of ["pending", "given-up"] as const) {
      const target = await seedTurnWithTask(userA, catA, status);
      await expect(
        uiActionService.execute(
          target.location,
          { requestId: randomUUID(), actionId: target.actionId },
          userA,
        ),
      ).rejects.toMatchObject({ statusCode: 422 });
      expect((await Task.findById(target.task._id))?.status).toBe(status);
    }

    // Receipt save failure rolls back task and stats and leaves zero outcomes
    const rollbackTarget = await seedTurnWithTask(userA, catA, "in-progress");
    const statsBefore = await statService.getStats(userA);
    vi.spyOn(McpWriteReceipt, "create").mockRejectedValueOnce(
      new Error("receipt write failed"),
    );
    await expect(
      uiActionService.execute(
        rollbackTarget.location,
        { requestId: randomUUID(), actionId: rollbackTarget.actionId },
        userA,
      ),
    ).rejects.toThrow("receipt write failed");

    expect((await Task.findById(rollbackTarget.task._id))?.status).toBe(
      "in-progress",
    );
    expect((await statService.getStats(userA)).completedTasks).toBe(
      statsBefore.completedTasks,
    );
    expect(
      await uiActionService.recentOutcomes(
        String(userA._id),
        rollbackTarget.conversationId,
      ),
    ).toEqual([]);
  });

  it("projects bounded outcomes to history with turnId without creating activities and survives surface fallback", async () => {
    const seeded = await seedTurnWithTask(userA, catA, "in-progress");
    const t2 = await Task.create({
      title: "Extra 2",
      categoryId: catA,
      status: "in-progress",
    });
    const t3 = await Task.create({
      title: "Extra 3",
      categoryId: catA,
      status: "in-progress",
    });
    const t4 = await Task.create({
      title: "Extra 4",
      categoryId: catA,
      status: "in-progress",
    });

    const multiSurface = await interactiveUiService.prepare(
      {
        fallbackText: "Multiple buttons",
        components: [
          {
            id: "root",
            component: "Column",
            children: ["b2", "b3", "b4"],
            gap: "sm",
          },
          { id: "b2", component: "Button", label: "2", actionKey: "k2" },
          { id: "b3", component: "Button", label: "3", actionKey: "k3" },
          { id: "b4", component: "Button", label: "4", actionKey: "k4" },
        ],
        displayData: {},
        actions: {
          k2: { name: "task.complete", taskId: String(t2._id) },
          k3: { name: "task.complete", taskId: String(t3._id) },
          k4: { name: "task.complete", taskId: String(t4._id) },
        },
      },
      userA,
    );
    const secondTurnId = randomUUID();
    await ChatTurn.create({
      _id: secondTurnId,
      conversationId: seeded.conversationId,
      userId: userA._id,
      requestId: randomUUID(),
      sequence: 2,
      userInput: "More buttons",
      status: "completed",
      mode: "auto",
      executionToken: randomUUID(),
      interactions: [],
      response: multiSurface.spec.fallbackText,
      uiSurface: multiSurface,
      messages: [],
      activities: [],
      expiresAt: new Date(Date.now() + 60_000),
    });

    await uiActionService.execute(
      seeded.location,
      { requestId: randomUUID(), actionId: seeded.actionId },
      userA,
    );
    for (const binding of multiSurface.actionBindings) {
      await uiActionService.execute(
        {
          conversationId: seeded.conversationId,
          turnId: secondTurnId,
          surfaceId: multiSurface.surfaceId,
        },
        { requestId: randomUUID(), actionId: binding.id },
        userA,
      );
    }

    // Bounded to 3, deterministic descending, scoped to userA + conversationId
    const outcomes = await uiActionService.recentOutcomes(
      String(userA._id),
      seeded.conversationId,
    );
    expect(outcomes).toHaveLength(3);
    expect(outcomes.map((o) => o.actionId)).toEqual(
      [...multiSurface.actionBindings].reverse().map((b) => b.id),
    );
    expect(
      await uiActionService.recentOutcomes(
        String(userB._id),
        seeded.conversationId,
      ),
    ).toEqual([]);

    // Corrupt stored surface on second turn: history falls back cleanly, no manufactured activity, explicit turnId present
    await ChatTurn.updateOne(
      { _id: secondTurnId },
      { $set: { "uiSurface.catalogId": "urn:orbit:a2ui:broken:v1" } },
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const conv = await conversationService.get(
      String(userA._id),
      seeded.conversationId,
    );
    expect(conv?.activities).toEqual([]);
    expect(conv?.uiActionOutcomes).toEqual(outcomes);
    const botMsg2 = conv?.messages.find(
      (m: { id: string }) => m.id === `${secondTurnId}:bot`,
    ) as {
      turnId?: string;
      surface?: unknown;
      uiActionOutcomes?: unknown[];
    };
    expect(botMsg2.turnId).toBe(secondTurnId);
    expect(botMsg2.surface).toBeUndefined();
    expect(botMsg2.uiActionOutcomes).toEqual(outcomes);
  });
});
