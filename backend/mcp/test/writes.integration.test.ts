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
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createOrbitMcpServer } from "../server.js";
import { taskWriteService } from "../services/taskWriteService.js";
import { McpWriteReceipt } from "../repositories/writeRepository.js";
import { statService } from "../../services/statService.js";
import User from "../../models/User.js";
import Category from "../../models/Category.js";
import Project from "../../models/Project.js";
import Task from "../../models/Task.js";
import Stat from "../../models/Stat.js";
import type { IUserDocument } from "../../types/IUser.js";
import type { McpContext } from "../context.js";

const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const dbName = `orbit_mcp_phase4_test_${process.pid}_${Date.now()}`;
const oid = () => new mongoose.Types.ObjectId();
const userA = { _id: oid(), role: "USER" } as IUserDocument;
const userB = { _id: oid(), role: "USER" } as IUserDocument;
const context = (user = userA): McpContext => ({
  user,
  scopes: ["tasks:write"],
  requestId: randomUUID(),
});
const ca = oid(),
  cb = oid(),
  projectB = oid();

describe.skipIf(!uri)("Phase 4 MongoDB replica-set writes", () => {
  beforeAll(async () => {
    if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(uri))
      throw new Error("Use a disposable loopback MongoDB URI ending in /");
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
    await User.collection.insertMany(
      [userA, userB].map((u, i) => ({
        _id: u._id,
        role: u.role,
        name: `test-${i}`,
        email: `test-${i}@example.test`,
      })),
    );
    await Category.create([
      { _id: ca, userId: userA._id, name: "Uncategorized" },
      { _id: cb, userId: userB._id, name: "Uncategorized" },
    ]);
    await Project.create({ _id: projectB, userId: userB._id, name: "private" });
    // Create collections/indexes before transactions (no production database touched).
    await Task.init();
    await Stat.init();
    await McpWriteReceipt.init();
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("discovers six tools for internal chat and executes a write over the real SDK", async () => {
    const server = createOrbitMcpServer(context(userB));
    const client = new Client({ name: "write-test", version: "1" });
    const [s, c] = InMemoryTransport.createLinkedPair();
    try {
      await server.connect(s);
      await client.connect(c);
      const tools = (await client.listTools()).tools;
      expect(tools).toHaveLength(7);
      expect(tools.map((tool) => tool.name)).not.toEqual(expect.arrayContaining(["orbit_start_task"]));
      expect(tools.map((tool) => tool.name)).not.toContain("orbit_complete_task");
      expect(tools.map((tool) => tool.name)).not.toContain("orbit_give_up_task");
      expect(
        tools.filter((t) => t.annotations?.readOnlyHint === false),
      ).toHaveLength(2);
      const result = await client.callTool({
        name: "orbit_create_task",
        arguments: { idempotencyKey: randomUUID(), title: "SDK task" },
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        task: { title: "SDK task", status: "pending" },
      });
      const taskId = (result.structuredContent as { task: { id: string } }).task
        .id;
      const updated = await client.callTool({
        name: "orbit_update_task",
        arguments: {
          idempotencyKey: randomUUID(),
          taskId,
          changes: { title: "SDK edited" },
        },
      });
      expect(updated.structuredContent).toMatchObject({
        task: { title: "SDK edited" },
      });
      await taskWriteService.update({ idempotencyKey: randomUUID(), taskId, changes: { status: "in-progress" } }, context(userB));
      const completed = await client.callTool({
        name: "orbit_update_task",
        arguments: {
          changes: { status: "completed" },
          idempotencyKey: randomUUID(),
          taskId,
        },
      });
      expect(completed.structuredContent).toMatchObject({
        task: { status: "completed" },
      });
      const pending = await Task.create({
        title: "SDK pending",
        categoryId: cb,
        status: "pending",
      });
      const started = await client.callTool({
        name: "orbit_update_task",
        arguments: {
          changes: { status: "in-progress" },
          idempotencyKey: randomUUID(),
          taskId: String(pending._id),
        },
      });
      expect(started.structuredContent).toMatchObject({
        task: { status: "in-progress" },
      });
      const givenUp = await client.callTool({
        name: "orbit_update_task",
        arguments: {
          changes: { status: "given-up" },
          idempotencyKey: randomUUID(),
          taskId: String(pending._id),
        },
      });
      expect(givenUp.structuredContent).toMatchObject({
        task: { status: "given-up" },
      });
      const invalid = await client.callTool({
        name: "orbit_update_task",
        arguments: {
          idempotencyKey: randomUUID(),
          taskId: String(oid()),
          changes: { status: "invalid" },
        },
      });
      expect(invalid.isError).toBe(true);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("deduplicates concurrent creates and stores one audit receipt", async () => {
    const input = { idempotencyKey: randomUUID(), title: "concurrent create" };
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        taskWriteService.create(input, context()),
      ),
    );
    expect(new Set(results.map((r) => r.task.id)).size).toBe(1);
    expect(await Task.countDocuments({ title: input.title })).toBe(1);
    expect(results.every((result) => result.task.status === "pending")).toBe(true);
    expect((await Task.findById(results[0].task.id))?.status).toBe("pending");
    expect(
      await McpWriteReceipt.countDocuments({ taskId: results[0].task.id }),
    ).toBe(1);
    await expect(
      taskWriteService.create({ ...input, title: "different" }, context()),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("serializes distinct first writes for a user without existing stats", async () => {
    const user = { _id: oid(), role: "USER" } as IUserDocument;
    await User.collection.insertOne({
      _id: user._id,
      role: "USER",
      email: "cold@example.test",
    });
    await Category.create({ userId: user._id, name: "Uncategorized" });
    await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        taskWriteService.create(
          {
            idempotencyKey: randomUUID(),
            title: `cold-${i}`,
          },
          context(user),
        ),
      ),
    );
    expect(await Stat.countDocuments({ userId: user._id })).toBe(1);
    expect(await Stat.findOne({ userId: user._id })).toMatchObject({
      totalTasks: 3,
      pendingTasks: 3,
      inProgressTasks: 0,
    });
  });

  it("scopes identical keys to each user and rejects cross-user references and writes", async () => {
    const input = { idempotencyKey: randomUUID(), title: "same key per user" };
    const a = await taskWriteService.create(input, context());
    const b = await taskWriteService.create(input, context(userB));
    expect(a.task.id).not.toBe(b.task.id);
    for (const changes of [
      { title: "stolen" }, { status: "in-progress" },
      { status: "completed" }, { status: "given-up" },
    ]) {
      await expect(taskWriteService.update({
        idempotencyKey: randomUUID(), taskId: b.task.id, changes,
      }, context())).rejects.toMatchObject({ code: "TASK_0002" });
    }
    for (const reference of [
      { categoryId: String(cb) },
      { projectId: String(projectB) },
    ]) {
      await expect(
        taskWriteService.create(
          { ...input, idempotencyKey: randomUUID(), ...reference },
          context(),
        ),
      ).rejects.toBeDefined();
      await expect(
        taskWriteService.update(
          {
            idempotencyKey: randomUUID(),
            taskId: a.task.id,
            changes: reference,
          },
          context(),
        ),
      ).rejects.toBeDefined();
    }
  });

  it("updates content and dates; validates merged dates and completed projects", async () => {
    const created = await taskWriteService.create(
      {
        idempotencyKey: randomUUID(),
        title: "dates",
        startDate: "2026-10-20T09:00:00+07:00",
        dueDate: "2026-10-21T09:00:00+07:00",
      },
      context(),
    );
    const taskId = created.task.id;
    await expect(
      taskWriteService.update(
        {
          idempotencyKey: randomUUID(),
          taskId,
          changes: { dueDate: "2026-10-19T09:00:00+07:00" },
        },
        context(),
      ),
    ).rejects.toMatchObject({ code: "COMMON_0005" });
    const updated = await taskWriteService.update(
      {
        idempotencyKey: randomUUID(),
        taskId,
        changes: { title: "updated", dueDate: null, projectId: null },
      },
      context(),
    );
    expect(updated.task).toMatchObject({
      title: "updated",
      dueDate: null,
      projectId: null,
    });
    const project = await Project.create({
      userId: userA._id,
      name: "finished",
      status: "completed",
    });
    await expect(
      taskWriteService.update(
        {
          idempotencyKey: randomUUID(),
          taskId,
          changes: { projectId: String(project._id) },
        },
        context(),
      ),
    ).rejects.toMatchObject({ code: "TASK_0007" });
  });

  it("transitions through dedicated services without double-counting repeated completion", async () => {
    const pending = await Task.create({
      title: "pending",
      categoryId: ca,
      status: "pending",
    });
    const taskId = String(pending._id);
    await taskWriteService.update({ ...({ idempotencyKey: randomUUID(), taskId }), changes: { status: "in-progress" } },
      context(),
    );
    const input = { idempotencyKey: randomUUID(), taskId };
    const concurrent = await Promise.all([
      taskWriteService.update({ ...(input), changes: { status: "completed" } }, context()),
      taskWriteService.update({ ...(input), changes: { status: "completed" } }, context()),
    ]);
    expect(concurrent[0]).toEqual(concurrent[1]);
    const completed = concurrent[0];
    const replay = await taskWriteService.update({ ...(input), changes: { status: "completed" } }, context());
    const again = await taskWriteService.update({ ...({ ...input, idempotencyKey: randomUUID() }), changes: { status: "completed" } },
      context(),
    );
    expect(replay).toEqual(completed);
    expect(again.task.completedAt).toBe(completed.task.completedAt);
    const stats = await Stat.findOne({ userId: userA._id });
    expect(stats?.completedTasks).toBe(1);
    expect(
      stats?.dailyStats.reduce((n, day) => n + day.completedTasks, 0),
    ).toBe(1);
    await expect(
      taskWriteService.update({ ...({ idempotencyKey: randomUUID(), taskId }), changes: { status: "given-up" } },
        context(),
      ),
    ).rejects.toMatchObject({ code: "TASK_0009" });
    const other = await taskWriteService.create(
      { idempotencyKey: randomUUID(), title: "give up" },
      context(),
    );
    await taskWriteService.update({ idempotencyKey: randomUUID(), taskId: other.task.id, changes: { status: "in-progress" } }, context());
    const givenUp = await taskWriteService.update({ ...({ idempotencyKey: randomUUID(), taskId: other.task.id }), changes: { status: "given-up" } },
      context(),
    );
    expect(givenUp.task.status).toBe("given-up");
    expect((await Stat.findOne({ userId: userA._id }))?.givenUpTasks).toBe(1);
  });

  it("updates metadata and status together and rolls both back on invalid transition", async () => {
    const created = await taskWriteService.create({ idempotencyKey: randomUUID(), title: "combined" }, context());
    await taskWriteService.update({ idempotencyKey: randomUUID(), taskId: created.task.id, changes: { status: "in-progress" } }, context());
    const input = { idempotencyKey: randomUUID(), taskId: created.task.id,
      changes: { title: "combined finished", status: "completed" } };
    const finished = await taskWriteService.update(input, context());
    expect(finished.task).toMatchObject({ title: "combined finished", status: "completed" });
    expect(await taskWriteService.update(input, context())).toEqual(finished);
    await expect(taskWriteService.update({
      idempotencyKey: randomUUID(), taskId: created.task.id,
      changes: { title: "should rollback", status: "in-progress" },
    }, context())).rejects.toMatchObject({ code: "TASK_0008" });
    expect(await Task.findById(created.task.id)).toMatchObject({ title: "combined finished", status: "completed" });
  });

  it("preserves historical completion and give-up dates after metadata edits", async () => {
    const historical = new Date("2025-01-05T12:00:00Z");
    for (const status of ["completed", "given-up"] as const) {
      const task = await Task.create({
        title: `historical ${status}`,
        categoryId: ca,
        status,
      });
      await Task.collection.updateOne(
        { _id: task._id },
        { $set: { updatedAt: historical } },
      );
      await taskWriteService.update(
        {
          idempotencyKey: randomUUID(),
          taskId: String(task._id),
          changes: { title: "edited later" },
        },
        context(),
      );
      const changed = await Task.findById(task._id);
      expect(
        status === "completed" ? changed?.completedAt : changed?.givenUpAt,
      ).toEqual(historical);
    }
    const stats = await Stat.findOne({ userId: userA._id });
    const day = stats?.dailyStats.find((entry) =>
      entry.date.toISOString().startsWith("2025-01-05"),
    );
    expect(day).toMatchObject({ completedTasks: 1, givenUpTasks: 1 });
  });

  it("cannot mutate a task readable only through a project owned by the caller", async () => {
    const project = await Project.create({
      userId: userA._id,
      name: "mixed ownership",
    });
    const task = await Task.create({
      title: "legacy mixed",
      categoryId: cb,
      projectId: project._id,
    });
    await expect(
      taskWriteService.update(
        {
          idempotencyKey: randomUUID(),
          taskId: String(task._id),
          changes: { title: "changed" },
        },
        context(),
      ),
    ).rejects.toMatchObject({ code: "TASK_0002" });
    expect((await Task.findById(task._id))?.title).toBe("legacy mixed");
  });

  it("does not replay a receipt after task ownership is lost", async () => {
    const input = { idempotencyKey: randomUUID(), title: "ownership replay" };
    const result = await taskWriteService.create(input, context());
    await Task.updateOne({ _id: result.task.id }, { $set: { categoryId: cb } });
    await expect(
      taskWriteService.create(input, context()),
    ).rejects.toMatchObject({ code: "TASK_0002" });
  });

  it("rolls back a completed task if audit persistence fails", async () => {
    const created = await taskWriteService.create(
      { idempotencyKey: randomUUID(), title: "audit rollback" },
      context(),
    );
    await taskWriteService.update({ idempotencyKey: randomUUID(), taskId: created.task.id, changes: { status: "in-progress" } }, context());
    const before = await Stat.findOne({ userId: userA._id }).lean();
    const spy = vi
      .spyOn(McpWriteReceipt, "create")
      .mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(
      taskWriteService.update({ ...({ idempotencyKey: randomUUID(), taskId: created.task.id }), changes: { status: "completed" } },
        context(),
      ),
    ).rejects.toThrow("audit unavailable");
    spy.mockRestore();
    expect((await Task.findById(created.task.id))?.status).toBe("in-progress");
    expect(await Stat.findOne({ userId: userA._id }).lean()).toEqual(before);
  });

  it("rolls back task, stats and audit on failure and can safely retry", async () => {
    const input = { idempotencyKey: randomUUID(), title: "rollback" };
    const beforeTasks = await Task.countDocuments();
    const beforeReceipts = await McpWriteReceipt.countDocuments();
    const beforeStats = await Stat.findOne({ userId: userA._id }).lean();
    const spy = vi
      .spyOn(statService, "getStats")
      .mockRejectedValueOnce(new Error("injected failure"));
    await expect(taskWriteService.create(input, context())).rejects.toThrow(
      "injected failure",
    );
    spy.mockRestore();
    expect(await Task.countDocuments()).toBe(beforeTasks);
    expect(await McpWriteReceipt.countDocuments()).toBe(beforeReceipts);
    expect(await Stat.findOne({ userId: userA._id }).lean()).toEqual(
      beforeStats,
    );
    await taskWriteService.create(input, context());
    expect(await Task.countDocuments({ title: "rollback" })).toBe(1);
  });
});
