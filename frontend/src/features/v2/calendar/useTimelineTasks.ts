import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { startOfDay } from "@/features/calendar/api/calendarRanges";
import { taskKeys } from "@/features/tasks/api/taskKeys";
import {
  TIMELINE_WINDOW_DAYS,
  loadTimelineWindow,
  type TimelineWindow,
} from "./timelineData";

export function useTimelineTasks(
  anchor: Date,
  options?: { enabled?: boolean },
) {
  const normalizedAnchor = useMemo(() => startOfDay(anchor), [anchor]);
  const startIso = normalizedAnchor.toISOString();

  return useInfiniteQuery<TimelineWindow, Error>({
    queryKey: taskKeys.timeline(startIso),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      loadTimelineWindow(normalizedAnchor, Number(pageParam), signal),
    getNextPageParam: (_lastPage, _allPages, lastPageParam) =>
      Number(lastPageParam) + TIMELINE_WINDOW_DAYS,
    enabled: options?.enabled ?? true,
  });
}
