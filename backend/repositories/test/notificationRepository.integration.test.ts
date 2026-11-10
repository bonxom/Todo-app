import mongoose from "mongoose";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import Notification from "../../models/Notification.js";
import { notificationRepository as repo } from "../notificationRepository.js";
const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const dbName = `orbit_notifications_test_${process.pid}_${Date.now()}`;
const recipientId = new mongoose.Types.ObjectId();
const otherId = new mongoose.Types.ObjectId();
const input = {
  recipientId,
  taskId: new mongoose.Types.ObjectId(),
  type: "due_soon" as const,
  dueAt: new Date("2026-11-09T20:00:00Z"),
  taskTitle: "Report",
};
describe.skipIf(!uri)("notification persistence", () => {
  beforeAll(async () => {
    if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(uri))
      throw new Error("Use disposable loopback MongoDB");
    await mongoose.connect(uri, { dbName });
    await repo.initIndexes();
  });
  beforeEach(async () => {
    await Notification.deleteMany({});
  });
  afterAll(async () => {
    if (mongoose.connection.name === dbName)
      await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  it("deduplicates concurrent upserts and preserves read history", async () => {
    await Promise.all(Array.from({ length: 20 }, () => repo.insertOnce(input)));
    expect(await Notification.countDocuments()).toBe(1);
    const before = await Notification.findOne().lean();
    const readAt = new Date();
    await Notification.updateOne({}, { $set: { readAt } });
    await repo.insertOnce(input);
    const after = await Notification.findOne().lean();
    expect(after?.createdAt).toEqual(before?.createdAt);
    expect(after?.readAt).toEqual(readAt);
    await repo.insertOnce({ ...input, type: "overdue" });
    await repo.insertOnce({
      ...input,
      dueAt: new Date("2026-11-10T20:00:00Z"),
    });
    expect(await Notification.countDocuments()).toBe(3);
  });
  it("scopes reads and mutations and preserves first read timestamp", async () => {
    await repo.insertOnce(input);
    await repo.insertOnce({ ...input, recipientId: otherId });
    const item = await Notification.findOne({ recipientId }).lean();
    expect(
      (
        await repo.list(String(recipientId), {
          pageNo: 1,
          pageSize: 20,
          filter: "all",
        })
      ).data,
    ).toHaveLength(1);
    expect(
      await repo.markRead(String(otherId), String(item!._id), new Date()),
    ).toBeNull();
    const first = new Date("2026-11-09T21:00:00Z");
    await repo.markRead(String(recipientId), String(item!._id), first);
    expect(
      (await repo.markRead(String(recipientId), String(item!._id), new Date()))
        ?.readAt,
    ).toEqual(first);
    expect(await repo.unreadCount(String(recipientId))).toBe(0);
    expect(await repo.unreadCount(String(otherId))).toBe(1);
  });
  it("read-all uses cutoff and pagination/filter are stable", async () => {
    const cutoff = new Date("2026-11-09T21:00:00Z");
    await Notification.collection.insertMany([
      { ...input, readAt: null, createdAt: new Date(cutoff.getTime() - 1) },
      {
        ...input,
        taskId: new mongoose.Types.ObjectId(),
        readAt: null,
        createdAt: new Date(cutoff.getTime() + 1),
      },
      {
        ...input,
        recipientId: otherId,
        readAt: null,
        createdAt: new Date(cutoff.getTime() - 1),
      },
    ]);
    expect(await repo.markAllRead(String(recipientId), cutoff)).toBe(1);
    const page = await repo.list(String(recipientId), {
      pageNo: 1,
      pageSize: 1,
      filter: "unread",
    });
    expect(page.pageInfo.totalCount).toBe(1);
    expect(page.data).toHaveLength(1);
    expect(await repo.unreadCount(String(otherId))).toBe(1);
  });
  it("deletes all old read/unread pages for caller and preserves new/foreign records", async () => {
    const cutoff = new Date("2026-11-10T21:00:00Z");
    const old = Array.from({ length: 23 }, (_, i) => ({
      _id: new mongoose.Types.ObjectId(),
      ...input,
      taskId: new mongoose.Types.ObjectId(),
      readAt: i % 2 ? cutoff : null,
      createdAt: new Date(cutoff.getTime() - 1000),
    }));
    await Notification.collection.insertMany([
      ...old,
      { ...input, createdAt: new Date(cutoff.getTime() + 1000), readAt: null },
      {
        ...input,
        recipientId: otherId,
        createdAt: new Date(cutoff.getTime() - 1000),
        readAt: null,
      },
    ]);
    expect(await repo.deleteAll(String(recipientId), cutoff)).toBe(23);
    const page = await repo.list(String(recipientId), {
      pageNo: 1,
      pageSize: 20,
      filter: "all",
    });
    expect(page.data).toHaveLength(1);
    expect(page.pageInfo.totalCount).toBe(1);
    expect(await repo.unreadCount(String(recipientId))).toBe(1);
    expect(await repo.unreadCount(String(otherId))).toBe(1);
    expect(
      await repo.markRead(String(recipientId), String(old[0]._id), cutoff),
    ).toBeNull();
    expect(await repo.markAllRead(String(recipientId), cutoff)).toBe(0);
    expect(await repo.deleteAll(String(recipientId), cutoff)).toBe(0);
    expect(page.data[0]).not.toHaveProperty("deletedAt");
  });
  it("retains the deduplication key after deletion without suppressing a new reminder type", async () => {
    await repo.insertOnce(input);
    const item = await Notification.findOne().lean();
    const cutoff = new Date(Date.now() + 1000);
    const [deleted] = await Promise.all([
      repo.deleteAll(String(recipientId), cutoff),
      repo.insertOnce(input),
    ]);
    expect(deleted).toBe(1);
    expect(await repo.insertOnce(input)).toBe(false);
    await Promise.all(Array.from({ length: 10 }, () => repo.insertOnce(input)));
    expect(
      (
        await repo.list(String(recipientId), {
          pageNo: 1,
          pageSize: 20,
          filter: "all",
        })
      ).data,
    ).toHaveLength(0);
    expect(
      await repo.markRead(String(recipientId), String(item!._id), cutoff),
    ).toBeNull();
    expect(await repo.insertOnce({ ...input, type: "overdue" })).toBe(true);
    expect(await repo.unreadCount(String(recipientId))).toBe(1);
    expect(await Notification.countDocuments()).toBe(2);
  });
});
