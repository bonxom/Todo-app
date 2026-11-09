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
