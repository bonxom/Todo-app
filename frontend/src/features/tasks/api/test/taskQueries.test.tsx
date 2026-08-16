import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useCalendarTasksQuery } from "../taskQueries";
import { taskService } from "@/shared/services/taskService";
import type { Task } from "@/shared/types/domain";

const rangeA = {
  startDate: "2026-08-01T00:00:00.000Z",
  endDate: "2026-08-31T23:59:59.999Z",
};

const rangeB = {
  startDate: "2026-09-01T00:00:00.000Z",
  endDate: "2026-09-30T23:59:59.999Z",
};

const task: Task = {
  _id: "task-august",
  title: "August task",
  status: "in-progress",
  priority: "Medium",
  categoryId: null,
  projectId: null,
  startDate: "2026-08-01T00:00:00.000Z",
  dueDate: "2026-08-14T09:00:00.000Z",
};

describe("useCalendarTasksQuery", () => {
  it("keeps the previous range data visible while the next range is loading", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    let resolveNextRange!: (tasks: Task[]) => void;
    vi.spyOn(taskService, "getTasksByDateRange")
      .mockResolvedValueOnce([task])
      .mockImplementationOnce(() => new Promise<Task[]>((resolve) => {
        resolveNextRange = resolve;
      }));

    const { result, rerender } = renderHook(
      ({ range }) => useCalendarTasksQuery(range),
      { initialProps: { range: rangeA }, wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual([task]);
    });

    rerender({ range: rangeB });

    expect(result.current.data).toEqual([task]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(true);

    await act(async () => {
      resolveNextRange([]);
    });
  });
});
