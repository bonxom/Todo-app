import { keepPreviousData, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { taskService } from "../../../shared/services/taskService";
import type { EntityId, PaginatedResponse, PagingParams, Task, TaskStatus } from "../../../shared/types/domain";
import { taskKeys, type CalendarRangeParams, type TaskListFilters } from "./taskKeys";

export const useTasksQuery = (
  filters?: TaskListFilters,
  options?: Omit<UseQueryOptions<PaginatedResponse<Task>, Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async ({ signal }) => {
      return taskService.getAllTasks(
        {
          pageNo: filters?.pageNo,
          pageSize: filters?.pageSize,
          sort: filters?.sort,
          search: filters?.search,
          status: filters?.status as TaskStatus | undefined,
          projectId: filters?.projectId ?? undefined,
        },
        { signal }
      );
    },
    placeholderData: keepPreviousData,
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
  params?: PagingParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<Task>, Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: taskKeys.todayDeadlines(params),
    queryFn: ({ signal }) => taskService.getTodayDeadlines(params, { signal }),
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useTasksByStatusQuery = (
  status: string,
  params?: PagingParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<Task>, Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: taskKeys.byStatus(status, params),
    queryFn: ({ signal }) => taskService.getTaskByStatus(status, params, { signal }),
    enabled: Boolean(status) && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useTasksByCategoryQuery = (
  categoryId: EntityId,
  params?: PagingParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<Task>, Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: taskKeys.byCategory(categoryId, params),
    queryFn: ({ signal }) => taskService.getTaskByCategory(categoryId, params, { signal }),
    enabled: Boolean(categoryId) && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
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
