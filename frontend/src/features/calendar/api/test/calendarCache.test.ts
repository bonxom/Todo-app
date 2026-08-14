import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  createCalendarSnapshot,
  getTaskId,
  removeTaskFromCollections,
  replaceProjectInList,
  restoreSnapshot,
  upsertTaskInCollections,
} from "../calendarCache";
import { taskKeys } from "@/features/tasks/api/taskKeys";
import { projectKeys } from "@/features/tasks/api/projectKeys";
import type { ProjectWithSummary, Task } from "@/shared/types/domain";

const makeTask = (id: string, dueDate = "2026-08-14T09:00:00.000Z"): Task => ({
  _id: id,
  title: `Task ${id}`,
  status: "in-progress",
  priority: "Medium",
  categoryId: null,
  projectId: null,
  startDate: "2026-08-01T00:00:00.000Z",
  dueDate,
});

describe("calendarCache", () => {
  let queryClient: QueryClient;
  const calendarKey = taskKeys.calendar({
    startDate: "2026-08-01T00:00:00.000Z",
    endDate: "2026-08-31T23:59:59.999Z",
  });

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  it("getTaskId extracts _id or id", () => {
    expect(getTaskId({ _id: "t1" } as Task)).toBe("t1");
    expect(getTaskId({ id: "t2" } as Task)).toBe("t2");
    expect(getTaskId(null)).toBeNull();
  });

  it("restores a calendar task snapshot after a rejected due-date move", () => {
    const task = makeTask("t1", "2026-08-14T09:00:00.000Z");
    queryClient.setQueryData(calendarKey, [task]);

    const snapshot = createCalendarSnapshot(queryClient);
    upsertTaskInCollections(queryClient, { ...task, dueDate: "2026-08-15T09:00:00.000Z" });
    expect(queryClient.getQueryData<Task[]>(calendarKey)?.[0].dueDate).toBe("2026-08-15T09:00:00.000Z");

    restoreSnapshot(queryClient, snapshot);
    expect(queryClient.getQueryData<Task[]>(calendarKey)?.[0].dueDate).toBe("2026-08-14T09:00:00.000Z");
  });

  it("replaces a collision-safe temporary copy with the server task", () => {
    queryClient.setQueryData(calendarKey, []);
    vi.stubGlobal("crypto", { randomUUID: () => "temp-uuid" });
    const temporaryId = `optimistic-${crypto.randomUUID()}`;
    const optimisticTask = { ...makeTask(temporaryId), dueDate: "2026-08-15T09:00:00.000Z" };
    const serverTask = { ...optimisticTask, _id: "server-task" };

    upsertTaskInCollections(queryClient, optimisticTask);
    expect(queryClient.getQueryData<Task[]>(calendarKey)?.map((t) => t._id)).toEqual([temporaryId]);

    upsertTaskInCollections(queryClient, serverTask, temporaryId);
    expect(queryClient.getQueryData<Task[]>(calendarKey)?.map((t) => t._id)).toEqual(["server-task"]);
  });

  it("removes a task from collections when it falls outside range or loses due date", () => {
    const task = makeTask("t1", "2026-08-14T09:00:00.000Z");
    queryClient.setQueryData(calendarKey, [task]);

    // Move task to next month (outside August range)
    upsertTaskInCollections(queryClient, { ...task, dueDate: "2026-09-14T09:00:00.000Z" });
    expect(queryClient.getQueryData<Task[]>(calendarKey)).toEqual([]);

    // Remove task directly
    queryClient.setQueryData(calendarKey, [task]);
    removeTaskFromCollections(queryClient, "t1");
    expect(queryClient.getQueryData<Task[]>(calendarKey)).toEqual([]);
  });

  it("replaceProjectInList updates project in query cache", () => {
    const project: ProjectWithSummary = {
      _id: "p1",
      name: "Project 1",
      description: "",
      color: "#fff",
      status: "active",
      summary: {
        totalTasks: 1,
        finishedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 1,
        completedTasks: 0,
        givenUpTasks: 0,
        scheduledTasks: 1,
        canComplete: false,
        completionRate: 0,
      },
    };
    queryClient.setQueryData(projectKeys.list(), [project]);

    replaceProjectInList(queryClient, { _id: "p1", status: "completed" });
    expect(queryClient.getQueryData<ProjectWithSummary[]>(projectKeys.list())?.[0].status).toBe("completed");
  });
});
