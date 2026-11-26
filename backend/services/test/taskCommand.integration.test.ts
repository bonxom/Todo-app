import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { taskWriteService } from "../../mcp/services/taskWriteService.js";
import type { McpContext } from "../../mcp/context.js";
import { McpWriteReceipt } from "../../repositories/taskCommandRepository.js";
import Category from "../../models/Category.js";
import Stat from "../../models/Stat.js";
import Task from "../../models/Task.js";
import User from "../../models/User.js";
import type { IUserDocument } from "../../types/IUser.js";
import type { UiCommandOrigin } from "../../types/ITaskCommand.js";
import { taskCommandService } from "../taskCommandService.js";

const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const dbName = `orbit_task_command_test_${process.pid}_${Date.now()}`;
const oid = () => new mongoose.Types.ObjectId();
const userA = { _id: oid(), role: "USER" } as IUserDocument;
const userB = { _id: oid(), role: "USER" } as IUserDocument;
const context = (user = userA): McpContext => ({
  user,
  scopes: ["tasks:write"],
  requestId: randomUUID(),
});
const ca = oid();
const cb = oid();

describe.skipIf(!uri)(
  "Shared taskCommandService MongoDB replica-set integration",
  () => {
    beforeAll(async () => {
      if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(uri)) {
        throw new Error("Use a disposable loopback MongoDB URI ending in /");
      }
      await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
      await User.collection.insertMany(
        [userA, userB].map((u, i) => ({
          _id: u._id,
          role: u.role,
          name: `cmd-test-${i}`,
          email: `cmd-test-${i}@example.test`,
        })),
      );
      await Category.create([
        { _id: ca, userId: userA._id, name: "Uncategorized" },
        { _id: cb, userId: userB._id, name: "Uncategorized" },
      ]);
      await Task.init();
      await Stat.init();
      await McpWriteReceipt.init();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    afterAll(async () => {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    });

    it("shares the same saved result between application and MCP adapters", async () => {
      const ctx = context();
      const input = { title: "shared command", idempotencyKey: randomUUID() };
      const direct = await taskCommandService.create(input, {
        user: ctx.user,
        requestId: ctx.requestId,
      });
      const replay = await taskWriteService.create(input, ctx);
      expect(replay).toEqual(direct);
      expect(await Task.countDocuments({ title: "shared command" })).toBe(1);
    });

    it("enforces origin matching on A2UI receipt replay and rolls back receipt failure", async () => {
      const created = await taskCommandService.create(
        { title: "origin test", idempotencyKey: randomUUID() },
        { user: userA, requestId: randomUUID() },
      );
      await taskCommandService.update(
        {
          taskId: created.task.id,
          changes: { status: "in-progress" },
          idempotencyKey: randomUUID(),
        },
        { user: userA, requestId: randomUUID() },
      );

      const origin: UiCommandOrigin = {
        channel: "a2ui",
        conversationId: randomUUID(),
        turnId: randomUUID(),
        surfaceId: randomUUID(),
        actionId: randomUUID(),
      };
      const key = `ui_${randomUUID()}`;
      const finishInput = {
        taskId: created.task.id,
        changes: { status: "completed" as const },
        idempotencyKey: key,
      };

      const done = await taskCommandService.update(finishInput, {
        user: userA,
        requestId: randomUUID(),
        origin,
      });
      expect(done.task.status).toBe("completed");

      const replay = await taskCommandService.update(finishInput, {
        user: userA,
        requestId: randomUUID(),
        origin,
      });
      expect(replay).toEqual(done);

      await expect(
        taskCommandService.update(finishInput, {
          user: userA,
          requestId: randomUUID(),
          origin: { ...origin, surfaceId: randomUUID() },
        }),
      ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });

      // Roll back on receipt creation failure
      const rollbackTask = await taskCommandService.create(
        { title: "rollback command", idempotencyKey: randomUUID() },
        { user: userA, requestId: randomUUID() },
      );
      await taskCommandService.update(
        {
          taskId: rollbackTask.task.id,
          changes: { status: "in-progress" },
          idempotencyKey: randomUUID(),
        },
        { user: userA, requestId: randomUUID() },
      );

      const statsBefore = await Stat.findOne({ userId: userA._id }).lean();
      vi.spyOn(McpWriteReceipt, "create").mockRejectedValueOnce(
        new Error("receipt write failed"),
      );

      await expect(
        taskCommandService.update(
          {
            taskId: rollbackTask.task.id,
            changes: { status: "completed" },
            idempotencyKey: `ui_${randomUUID()}`,
          },
          { user: userA, requestId: randomUUID(), origin },
        ),
      ).rejects.toThrow("receipt write failed");

      expect((await Task.findById(rollbackTask.task.id))?.status).toBe(
        "in-progress",
      );
      expect(await Stat.findOne({ userId: userA._id }).lean()).toEqual(
        statsBefore,
      );
    });
  },
);
