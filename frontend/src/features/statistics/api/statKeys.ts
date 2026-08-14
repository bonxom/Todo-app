import { normalizeFilters } from "../../tasks/api/taskKeys";

export interface ActivityFilters {
  date?: string;
  [key: string]: unknown;
}

export const statKeys = {
  all: ["stats"] as const,
  summary: () => [...statKeys.all, "summary"] as const,
  activity: (filters?: ActivityFilters) => {
    const normalized = normalizeFilters(filters as Record<string, unknown>);
    return normalized !== undefined
      ? ([...statKeys.all, "activity", normalized] as const)
      : ([...statKeys.all, "activity"] as const);
  },
};
