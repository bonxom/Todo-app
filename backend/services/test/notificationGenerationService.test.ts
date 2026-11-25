import { describe, it, expect, vi, afterEach } from "vitest";
import { classifyDeadline } from "../notificationGenerationService.js";
const due = new Date("2026-11-09T20:00:00Z");
describe("deadline classification", () => {
  it.each([
    ["2026-11-09T09:59:59.999Z", null],
    ["2026-11-09T10:00:00Z", "due_soon"],
    ["2026-11-09T19:59:59.999Z", "due_soon"],
    ["2026-11-09T20:00:00Z", "overdue"],
    ["2026-11-10T20:00:00Z", "overdue"],
  ])("classifies %s", (time, expected) => {
    expect(classifyDeadline("pending", due, new Date(time!))).toBe(expected);
  });
  it.each(["completed", "given-up"])("excludes %s", (status) => {
    expect(classifyDeadline(status, due, due)).toBeNull();
  });
  it("ignores missing and invalid dates", () => {
    expect(classifyDeadline("pending", null, due)).toBeNull();
    expect(classifyDeadline("pending", new Date("bad"), due)).toBeNull();
  });
  it("uses instants regardless of offset", () => {
    expect(
      classifyDeadline(
        "in-progress",
        new Date("2026-11-10T03:00:00+07:00"),
        due,
      ),
    ).toBe("overdue");
  });
});

import mongoose from "mongoose";
import { generateNotifications } from "../notificationGenerationService.js";
import { notificationTaskRepository as tasks } from "../../repositories/notificationTaskRepository.js";
import { notificationRepository as notifications } from "../../repositories/notificationRepository.js";
import { pushDispatchService } from "../pushDispatchService.js";
afterEach(() => vi.restoreAllMocks());
it.each(["completed", "given-up", "deleted", "changed"] as const)(
  "rechecks %s tasks before inserting",
  async (status) => {
    vi.spyOn(tasks, "findCandidateIds")
      .mockResolvedValueOnce(["task"])
      .mockResolvedValue([]);
    vi.spyOn(tasks, "findCurrentCandidate").mockResolvedValue(
      status === "deleted"
        ? null
        : {
            taskId: new mongoose.Types.ObjectId(),
            status: status === "changed" ? "pending" : status,
            dueAt:
              status === "changed" ? new Date(due.getTime() + 86_400_000) : due,
            title: "Report",
            recipientIds: [new mongoose.Types.ObjectId()],
          },
    );
    const insert = vi.spyOn(notifications, "insertOnce");
    await generateNotifications(due);
    expect(insert).not.toHaveBeenCalled();
  },
);
it("fails the scan on persistence errors so the worker can retry", async () => {
  vi.spyOn(tasks, "findCandidateIds")
    .mockResolvedValueOnce(["task"])
    .mockResolvedValue([]);
  vi.spyOn(tasks, "findCurrentCandidate").mockResolvedValue({
    taskId: new mongoose.Types.ObjectId(),
    status: "pending",
    dueAt: due,
    title: "Report",
    recipientIds: [new mongoose.Types.ObjectId()],
  });
  vi.spyOn(notifications, "insertOnce").mockRejectedValue(
    new Error("database offline"),
  );
  await expect(generateNotifications(due)).rejects.toThrow("database offline");
});

it("dispatches deadline push only for newly inserted notifications and ignores push errors", async () => {
  const taskId1 = new mongoose.Types.ObjectId();
  const taskId2 = new mongoose.Types.ObjectId();
  const user1 = new mongoose.Types.ObjectId();
  const user2 = new mongoose.Types.ObjectId();

  vi.spyOn(tasks, "findCandidateIds")
    .mockResolvedValueOnce(["t1", "t2"])
    .mockResolvedValue([]);
  vi.spyOn(tasks, "findCurrentCandidate")
    .mockResolvedValueOnce({
      taskId: taskId1,
      status: "pending",
      dueAt: due,
      title: "Submit thesis",
      recipientIds: [user1, user2],
    })
    .mockResolvedValueOnce({
      taskId: taskId2,
      status: "in-progress",
      dueAt: due,
      title: "Already notified",
      recipientIds: [user1],
    });

  vi.spyOn(notifications, "insertOnce")
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false);

  const pushSpy = vi
    .spyOn(pushDispatchService, "notifyDeadline")
    .mockRejectedValueOnce(new Error("push transport error"))
    .mockResolvedValueOnce({ sent: 1, removed: 0, failed: 0 });

  const summary = await generateNotifications(due);

  expect(summary).toEqual({ scanned: 2, inserted: 2 });
  expect(pushSpy).toHaveBeenCalledTimes(2);
  expect(pushSpy).toHaveBeenNthCalledWith(1, {
    recipientId: user1.toString(),
    taskId: taskId1.toString(),
    type: "overdue",
    taskTitle: "Submit thesis",
  });
  expect(pushSpy).toHaveBeenNthCalledWith(2, {
    recipientId: user2.toString(),
    taskId: taskId1.toString(),
    type: "overdue",
    taskTitle: "Submit thesis",
  });
});
