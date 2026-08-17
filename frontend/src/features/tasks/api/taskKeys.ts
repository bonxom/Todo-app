import type { EntityId, TaskStatus } from "../../../shared/types/domain";

export interface TaskListFilters {
  status?: TaskStatus | string;
  projectId?: EntityId | null;
  categoryId?: EntityId | null;
  pageNo?: number;
  pageSize?: number;
  sort?: string;
  search?: string;
  [key: string]: unknown;
}

export interface CalendarRangeParams {
  startDate: string;
  endDate: string;
}

export const normalizeFilters = <T extends Record<string, unknown>>(
  filters?: T
): Record<string, unknown> | undefined => {
  if (!filters || typeof filters !== "object") return undefined;

  const entries = Object.entries(filters)
    .filter(([_, value]) => value !== undefined && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(entries);
};

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters?: TaskListFilters) => {
    const normalized = normalizeFilters(filters as Record<string, unknown>);
    return normalized !== undefined
      ? ([...taskKeys.lists(), normalized] as const)
      : taskKeys.lists();
  },
  detail: (taskId: EntityId) => [...taskKeys.all, "detail", taskId] as const,
  calendarRoot: () => [...taskKeys.all, "calendar"] as const,
  calendar: (range: CalendarRangeParams) =>
    [
      ...taskKeys.calendarRoot(),
      {
        startDate: range.startDate,
        endDate: range.endDate,
      },
    ] as const,
  todayDeadlines: () => [...taskKeys.all, "today-deadlines"] as const,
};
