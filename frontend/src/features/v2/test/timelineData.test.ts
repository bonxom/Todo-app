import { beforeEach, describe, expect, it, vi } from "vitest";
import { taskService } from "@/shared/services/taskService";
import type { Task } from "@/shared/types/domain";
import {
  getTimelineWindow,
  groupTimelineTasks,
  loadTimelineWindow,
} from "../calendar/timelineData";

vi.mock("@/shared/services/taskService", () => ({
  taskService: {
    getAllTasks: vi.fn(),
  },
}));

const makeTask = (
  id: string,
  dueDate: string | undefined,
  overrides: Partial<Task> = {},
): Task => ({
  _id: id,
  title: `Task ${id}`,
  status: "pending",
  priority: "Medium",
  categoryId: null,
  projectId: null,
  startDate: "",
  dueDate,
  ...overrides,
});

describe("timelineData", () => {
  beforeEach(() => {
    vi.mocked(taskService.getAllTasks).mockReset();
  });

  describe("getTimelineWindow", () => {
    it("computes consecutive 14-day local windows across month boundaries", () => {
      const anchor = new Date(2026, 10, 25, 15, 45, 12);
      const first = getTimelineWindow(anchor, 0);
      const next = getTimelineWindow(anchor, 14);

      expect(first.start).toEqual(new Date(2026, 10, 25, 0, 0, 0, 0));
      expect(first.end).toEqual(new Date(2026, 11, 8, 23, 59, 59, 999));
      expect(next.start).toEqual(new Date(2026, 11, 9, 0, 0, 0, 0));
      expect(next.end).toEqual(new Date(2026, 11, 22, 23, 59, 59, 999));
      expect(
        new Date(next.startIso).getTime() - new Date(first.endIso).getTime(),
      ).toBe(1);
    });

    it("preserves local midnight across DST transitions and year end", () => {
      // March 8, 2026 is spring-forward in America/New_York (23-hour day).
      const springAnchor = new Date(2026, 2, 7, 9, 0, 0);
      const springFirst = getTimelineWindow(springAnchor, 0);
      const springNext = getTimelineWindow(springAnchor, 14);

      expect(springNext.start.getFullYear()).toBe(2026);
      expect(springNext.start.getMonth()).toBe(2);
      expect(springNext.start.getDate()).toBe(21);
      expect(springNext.start.getHours()).toBe(0);
      expect(springNext.start.getMinutes()).toBe(0);
      const elapsedHours =
        (springNext.start.getTime() - springFirst.start.getTime()) / 3_600_000;
      const offsetDeltaHours =
        (springNext.start.getTimezoneOffset() -
          springFirst.start.getTimezoneOffset()) /
        60;
      expect(elapsedHours).toBe(336 + offsetDeltaHours);
      if (
        Intl.DateTimeFormat().resolvedOptions().timeZone === "America/New_York"
      ) {
        expect(elapsedHours).toBe(335);
      }

      // Year-end crossing: December 20, 2026 -> January 2, 2027.
      const yearEndFirst = getTimelineWindow(new Date(2026, 11, 20, 23, 30), 0);
      const yearEndNext = getTimelineWindow(new Date(2026, 11, 20, 23, 30), 14);

      expect(yearEndFirst.end).toEqual(new Date(2027, 0, 2, 23, 59, 59, 999));
      expect(yearEndNext.start).toEqual(new Date(2027, 0, 3, 0, 0, 0, 0));
      expect(
        new Date(yearEndNext.startIso).getTime() -
          new Date(yearEndFirst.endIso).getTime(),
      ).toBe(1);

      // Dec 31 boundary check
      const dec31 = getTimelineWindow(new Date(2026, 11, 31, 12, 0), 0);
      expect(dec31.start).toEqual(new Date(2026, 11, 31, 0, 0, 0, 0));
      expect(dec31.end).toEqual(new Date(2027, 0, 13, 23, 59, 59, 999));
    });
  });

  describe("loadTimelineWindow", () => {
    it("reads all API pages for a window and forwards the abort signal", async () => {
      const anchor = new Date(2026, 10, 25);
      const expectedRange = getTimelineWindow(anchor, 0);
      const page1Tasks = Array.from({ length: 100 }, (_, i) =>
        makeTask(
          `task-${String(i + 1).padStart(3, "0")}`,
          new Date(2026, 10, 25 + (i % 14), 9, 0).toISOString(),
        ),
      );
      const page2Tasks = [
        makeTask("task-101", new Date(2026, 11, 8, 18, 0).toISOString()),
      ];

      vi.mocked(taskService.getAllTasks)
        .mockResolvedValueOnce({
          data: page1Tasks,
          pageInfo: {
            pageNo: 1,
            pageSize: 100,
            totalCount: 101,
            totalPage: 2,
          },
        })
        .mockResolvedValueOnce({
          data: page2Tasks,
          pageInfo: {
            pageNo: 2,
            pageSize: 100,
            totalCount: 101,
            totalPage: 2,
          },
        });

      const controller = new AbortController();
      const windowResult = await loadTimelineWindow(
        anchor,
        0,
        controller.signal,
      );

      expect(taskService.getAllTasks).toHaveBeenCalledTimes(2);
      expect(taskService.getAllTasks).toHaveBeenNthCalledWith(
        1,
        {
          startDate: expectedRange.startIso,
          endDate: expectedRange.endIso,
          pageNo: 1,
          pageSize: 100,
          sort: "dueDate:asc_createdAt:asc",
        },
        { signal: controller.signal },
      );
      expect(taskService.getAllTasks).toHaveBeenNthCalledWith(
        2,
        {
          startDate: expectedRange.startIso,
          endDate: expectedRange.endIso,
          pageNo: 2,
          pageSize: 100,
          sort: "dueDate:asc_createdAt:asc",
        },
        { signal: controller.signal },
      );
      expect(windowResult.range).toEqual(expectedRange);
      expect(windowResult.tasks).toHaveLength(101);
    });

    it("rejects the whole window if page 2 fails and restarts from page 1 on retry", async () => {
      const anchor = new Date(2026, 10, 25);
      const page1 = [
        makeTask("t1", new Date(2026, 10, 25, 9, 0).toISOString()),
      ];
      const page2 = [
        makeTask("t2", new Date(2026, 10, 26, 9, 0).toISOString()),
      ];

      vi.mocked(taskService.getAllTasks)
        .mockResolvedValueOnce({
          data: page1,
          pageInfo: { pageNo: 1, pageSize: 100, totalCount: 2, totalPage: 2 },
        })
        .mockRejectedValueOnce(new Error("Page 2 failed"))
        .mockResolvedValueOnce({
          data: page1,
          pageInfo: { pageNo: 1, pageSize: 100, totalCount: 2, totalPage: 2 },
        })
        .mockResolvedValueOnce({
          data: page2,
          pageInfo: { pageNo: 2, pageSize: 100, totalCount: 2, totalPage: 2 },
        });

      const controller = new AbortController();
      await expect(
        loadTimelineWindow(anchor, 0, controller.signal),
      ).rejects.toThrow("Page 2 failed");

      const retryResult = await loadTimelineWindow(
        anchor,
        0,
        controller.signal,
      );
      expect(taskService.getAllTasks).toHaveBeenCalledTimes(4);
      expect(taskService.getAllTasks).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ pageNo: 1 }),
        { signal: controller.signal },
      );
      expect(taskService.getAllTasks).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({ pageNo: 2 }),
        { signal: controller.signal },
      );
      expect(retryResult.tasks.map((task) => task._id)).toEqual(["t1", "t2"]);
    });

    it("filters out tasks with missing, invalid, or out-of-window due dates", async () => {
      const anchor = new Date(2026, 10, 25);
      vi.mocked(taskService.getAllTasks).mockResolvedValueOnce({
        data: [
          makeTask("valid-start", new Date(2026, 10, 25, 0, 0).toISOString()),
          makeTask(
            "valid-end",
            new Date(2026, 11, 8, 23, 59, 59, 999).toISOString(),
          ),
          makeTask(
            "before-window",
            new Date(2026, 10, 24, 23, 59, 59, 999).toISOString(),
          ),
          makeTask(
            "after-window",
            new Date(2026, 11, 9, 0, 0, 0, 0).toISOString(),
          ),
          makeTask("missing-due", undefined),
          makeTask("empty-due", ""),
          makeTask("invalid-due", "not-a-valid-date"),
        ],
        pageInfo: { pageNo: 1, pageSize: 100, totalCount: 7, totalPage: 1 },
      });

      const result = await loadTimelineWindow(
        anchor,
        0,
        new AbortController().signal,
      );
      expect(result.tasks.map((task) => task._id)).toEqual([
        "valid-start",
        "valid-end",
      ]);
    });
  });

  describe("groupTimelineTasks", () => {
    it("deduplicates by ID, orders by due instant then ID, keeps all statuses, and skips empty days", () => {
      const anchor = new Date(2026, 10, 25);
      const firstRange = getTimelineWindow(anchor, 0);
      const secondRange = getTimelineWindow(anchor, 14);

      const tSameInstantB = makeTask(
        "b-task",
        new Date(2026, 10, 25, 9, 0).toISOString(),
        { status: "completed" },
      );
      const tSameInstantA = makeTask(
        "a-task",
        new Date(2026, 10, 25, 9, 0).toISOString(),
        { status: "given-up" },
      );
      const tLaterToday = makeTask(
        "c-task",
        new Date(2026, 10, 25, 17, 30).toISOString(),
        { status: "in-progress" },
      );
      const tNextMonth = makeTask(
        "d-task",
        new Date(2026, 11, 10, 8, 15).toISOString(),
        { status: "pending" },
      );
      const tDuplicateFromSecondWindow = makeTask(
        "b-task",
        new Date(2026, 10, 25, 9, 0).toISOString(),
        { title: "Updated duplicate" },
      );

      const grouped = groupTimelineTasks([
        {
          range: firstRange,
          tasks: [tLaterToday, tSameInstantB, tSameInstantA],
        },
        {
          range: secondRange,
          tasks: [
            tNextMonth,
            tDuplicateFromSecondWindow,
            makeTask("bad-date", "invalid"),
          ],
        },
      ]);

      expect(grouped).toHaveLength(2);
      expect(grouped[0].key).toBe("2026-11-25");
      expect(grouped[0].date).toEqual(new Date(2026, 10, 25, 0, 0, 0, 0));
      expect(grouped[0].tasks.map((task) => task._id)).toEqual([
        "a-task",
        "b-task",
        "c-task",
      ]);

      expect(grouped[1].key).toBe("2026-12-10");
      expect(grouped[1].date).toEqual(new Date(2026, 11, 10, 0, 0, 0, 0));
      expect(grouped[1].tasks.map((task) => task._id)).toEqual(["d-task"]);
    });
  });
});
