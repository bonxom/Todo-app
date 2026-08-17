import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { statService } from "../../../shared/services/statService";
import type { Stat, Task } from "../../../shared/types/domain";
import { statKeys, type ActivityFilters } from "./statKeys";

export const useStatsQuery = (
  options?: Omit<UseQueryOptions<Stat, Error>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey: statKeys.summary(),
    queryFn: ({ signal }) => statService.getUserStats({ signal }),
    ...options,
  });
};

export const useActivityQuery = (
  filters?: ActivityFilters | string,
  options?: Omit<UseQueryOptions<Task[], Error>, "queryKey" | "queryFn">
) => {
  const date = typeof filters === "string" ? filters : filters?.date;
  return useQuery({
    queryKey: statKeys.activity(filters),
    queryFn: ({ signal }) => {
      if (!date) return Promise.resolve([]);
      return statService.getCompletedTasksByDate(date, { signal });
    },
    enabled: Boolean(date) && (options?.enabled ?? true),
    ...options,
  });
};
