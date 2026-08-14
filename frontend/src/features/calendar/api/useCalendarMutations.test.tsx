import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCalendarMutations } from "./useCalendarMutations";
import { taskService } from "../../../shared/services/taskService";
import { projectService } from "../../../shared/services/projectService";
import { taskKeys } from "../../tasks/api/taskKeys";
import { projectKeys } from "../../tasks/api/projectKeys";
import type { ProjectWithSummary, Task } from "../../../shared/types/domain";

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

describe("useCalendarMutations", () => {
  let queryClient: QueryClient;
  const calendarKey = taskKeys.calendar({
    startDate: "2026-08-01T00:00:00.000Z",
    endDate: "2026-08-31T23:59:59.999Z",
  });

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("applies optimistic status change and rolls back on failure", async () => {
    const wrapper = createWrapper();
    const task = makeTask("t1");
    queryClient.setQueryData(calendarKey, [task]);

    let rejectPromise!: (reason?: unknown) => void;
    const pendingPromise = new Promise<Task>((_, reject) => {
      rejectPromise = reject;
    });

    vi.spyOn(taskService, "finishTask").mockReturnValueOnce(pendingPromise);

    const { result } = renderHook(() => useCalendarMutations(), { wrapper });

    let mutationPromise: Promise<Task>;
    act(() => {
      mutationPromise = result.current.changeTaskStatus(task, "completed");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Check optimistic update in query cache before promise settles
    expect(queryClient.getQueryData<Task[]>(calendarKey)?.[0].status).toBe("completed");

    // Reject the mutation
    await act(async () => {
      rejectPromise(new Error("Server error"));
      await mutationPromise.catch(() => {});
    });

    // Cache must be rolled back to original status
    expect(queryClient.getQueryData<Task[]>(calendarKey)?.[0].status).toBe("in-progress");
  });

  it("applies optimistic due date change and commits server response on success", async () => {
    const wrapper = createWrapper();
    const task = makeTask("t1", "2026-08-14T09:00:00.000Z");
    queryClient.setQueryData(calendarKey, [task]);

    const updatedTask = { ...task, dueDate: "2026-08-20T09:00:00.000Z" };
    vi.spyOn(taskService, "updateTask").mockResolvedValueOnce(updatedTask);

    const { result } = renderHook(() => useCalendarMutations(), { wrapper });

    await act(async () => {
      await result.current.changeTaskDueDate(task, "2026-08-20T09:00:00.000Z");
    });

    expect(queryClient.getQueryData<Task[]>(calendarKey)?.[0].dueDate).toBe("2026-08-20T09:00:00.000Z");
  });

  it("applies optimistic task deletion and rolls back on failure", async () => {
    const wrapper = createWrapper();
    const task = makeTask("t1");
    queryClient.setQueryData(calendarKey, [task]);

    vi.spyOn(taskService, "deleteTask").mockRejectedValueOnce(new Error("Failed"));

    const { result } = renderHook(() => useCalendarMutations(), { wrapper });

    await act(async () => {
      await result.current.deleteTask("t1").catch(() => {});
    });

    expect(queryClient.getQueryData<Task[]>(calendarKey)).toEqual([task]);
  });

  it("copies task with temporary ID and replaces with server task", async () => {
    const wrapper = createWrapper();
    queryClient.setQueryData(calendarKey, []);

    const serverTask: Task = {
      ...makeTask("server-new-task", "2026-08-18T09:00:00.000Z"),
      title: "Copied Task",
    };
    vi.spyOn(taskService, "createTask").mockResolvedValueOnce(serverTask);

    const { result } = renderHook(() => useCalendarMutations(), { wrapper });

    await act(async () => {
      await result.current.copyTask(
        { title: "Copied Task", startDate: "2026-08-01T00:00:00.000Z" },
        "2026-08-18T09:00:00.000Z"
      );
    });

    const cached = queryClient.getQueryData<Task[]>(calendarKey);
    expect(cached).toHaveLength(1);
    expect(cached?.[0]._id).toBe("server-new-task");
    expect(cached?.[0].title).toBe("Copied Task");
  });

  it("updates project status optimistically and rolls back on failure", async () => {
    const wrapper = createWrapper();
    const project: ProjectWithSummary = {
      _id: "p1",
      name: "P1",
      description: "",
      color: "#fff",
      status: "active",
      summary: {
        totalTasks: 0,
        finishedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        givenUpTasks: 0,
        scheduledTasks: 0,
        canComplete: false,
        completionRate: 0,
      },
    };
    queryClient.setQueryData(projectKeys.list(), [project]);

    vi.spyOn(projectService, "updateProject").mockRejectedValueOnce(new Error("Fail"));

    const { result } = renderHook(() => useCalendarMutations(), { wrapper });

    await act(async () => {
      await result.current.changeProjectStatus("p1", "completed").catch(() => {});
    });

    expect(queryClient.getQueryData<ProjectWithSummary[]>(projectKeys.list())?.[0].status).toBe("active");
  });
});
