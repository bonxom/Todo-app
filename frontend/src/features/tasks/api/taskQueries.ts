import { keepPreviousData, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { taskService } from "../../../shared/services/taskService";
import type { EntityId, Task } from "../../../shared/types/domain";
import { taskKeys, type CalendarRangeParams, type TaskListFilters } from "./taskKeys";

export const useTasksQuery = (
  filters?: TaskListFilters,
  options?: Omit<UseQueryOptions<Task[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async ({ signal }) => {
      if (filters?.status) {
        return taskService.getTaskByStatus(String(filters.status), { signal });
      }
      if (filters?.categoryId) {
        return taskService.getTaskByCategory(String(filters.categoryId), { signal });
      }
      return taskService.getAllTasks({ signal });
    },
    ...options,
  });
};

export const useTaskQuery = (
  taskId: EntityId,
  options?: Omit<UseQueryOptions<Task, Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: ({ signal }) => taskService.getTaskById(taskId, { signal }),
    enabled: Boolean(taskId) && (options?.enabled ?? true),
    ...options,
  });
};

export const useTodayDeadlinesQuery = (
  options?: Omit<UseQueryOptions<Task[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: taskKeys.todayDeadlines(),
    queryFn: ({ signal }) => taskService.getTodayDeadlines({ signal }),
    ...options,
  });
};

export const useCalendarTasksQuery = (
  range: CalendarRangeParams,
  options?: Omit<UseQueryOptions<Task[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: taskKeys.calendar(range),
    queryFn: ({ signal }) =>
      taskService.getTasksByDateRange(range.startDate, range.endDate, { signal }),
    enabled: Boolean(range?.startDate && range?.endDate) && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
    ...options,
  });
};
