import mongoose from "mongoose";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import Task from "../../models/Task.js";
import Category from "../../models/Category.js";
import Project from "../../models/Project.js";
import Notification from "../../models/Notification.js";
import { generateNotifications } from "../notificationGenerationService.js";
import { notificationRepository } from "../../repositories/notificationRepository.js";
import { normalizeTaskDateInput } from "../../utils/dateTime.js";
const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const dbName = `orbit_notification_generation_${process.pid}_${Date.now()}`;
const owner = new mongoose.Types.ObjectId();
const other = new mongoose.Types.ObjectId();
const categoryId = new mongoose.Types.ObjectId();
const projectId = new mongoose.Types.ObjectId();
const due = new Date("2026-11-09T20:00:00Z");
const soon = new Date("2026-11-09T10:00:00Z");
describe.skipIf(!uri)("notification generation with real tasks", () => {
  beforeAll(async () => {
    if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(uri))
      throw new Error("Use disposable loopback MongoDB");
    await mongoose.connect(uri, { dbName });
    await notificationRepository.initIndexes();
    await Category.collection.insertOne({
      _id: categoryId,
      name: "Work",
      userId: owner,
    });
    await Project.collection.insertOne({
      _id: projectId,
      name: "Project",
      userId: owner,
    });
  });
  beforeEach(async () => {
    await Task.deleteMany({});
    await Notification.deleteMany({});
    await Project.updateOne({ _id: projectId }, { $set: { userId: owner } });
  });
  afterAll(async () => {
    if (mongoose.connection.name === dbName)
      await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const create = () =>
    Task.create({ title: "Report", categoryId, projectId, dueDate: due });
  it("deduplicates owners, concurrent scans, reopening and changed-back deadlines", async () => {
    const task = await create();
    await Promise.all([
      generateNotifications(soon),
      generateNotifications(soon),
    ]);
    expect(await Notification.countDocuments()).toBe(1);
    await generateNotifications(due);
    expect(await Notification.countDocuments()).toBe(2);
    await Task.updateOne({ _id: task._id }, { $set: { status: "completed" } });
    await generateNotifications(due);
    await Task.updateOne(
      { _id: task._id },
      {
        $set: { status: "pending", dueDate: new Date(due.getTime() + 3600000) },
      },
    );
    await generateNotifications(due);
    expect(await Notification.countDocuments()).toBe(3);
    await Task.updateOne({ _id: task._id }, { $set: { dueDate: due } });
    await generateNotifications(due);
    expect(await Notification.countDocuments()).toBe(3);
  });
  it("includes both actual owners but no admin fanout", async () => {
    await Project.updateOne({ _id: projectId }, { $set: { userId: other } });
    await create();
    await generateNotifications(soon);
    expect(
      (await Notification.find().lean())
        .map((n) => String(n.recipientId))
        .sort(),
    ).toEqual([String(owner), String(other)].sort());
  });
  it("skips finished, abandoned, deleted, no deadline and orphan tasks", async () => {
    await Task.create([
      { title: "Done", categoryId, status: "completed", dueDate: due },
      { title: "Given up", categoryId, status: "given-up", dueDate: due },
      { title: "No deadline", categoryId },
      { title: "Orphan", dueDate: due },
    ]);
    const task = await create();
    await task.deleteOne();
    expect((await generateNotifications(due)).inserted).toBe(0);
  });
  it("overdue catchup emits only overdue and removed deadline stops generation", async () => {
    const task = await create();
    await generateNotifications(due);
    expect((await Notification.find().lean()).map((n) => n.type)).toEqual([
      "overdue",
    ]);
    await Task.updateOne({ _id: task._id }, { $unset: { dueDate: 1 } });
    await generateNotifications(due);
    expect(await Notification.countDocuments()).toBe(1);
  });
  it("batches more than 200 tasks without losing records", async () => {
    await Task.insertMany(
      Array.from({ length: 201 }, (_, i) => ({
        title: `Task ${i}`,
        categoryId,
        dueDate: due,
      })),
    );
    expect(await generateNotifications(soon)).toEqual({
      scanned: 201,
      inserted: 201,
    });
  });
  it("preserves server-midnight date-only semantics", () => {
    const normalized = normalizeTaskDateInput("2026-11-09").value!;
    expect(normalized).toEqual(new Date(2026, 10, 9, 0, 0, 0, 0));
  });
});
