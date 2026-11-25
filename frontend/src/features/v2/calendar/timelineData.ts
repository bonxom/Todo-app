import {
  addDays,
  endOfDay,
  startOfDay,
  taskHasDueDateInRange,
  type CalendarRange,
} from "@/features/calendar/api/calendarRanges";
import { taskService } from "@/shared/services/taskService";
import type { Task } from "@/shared/types/domain";

export const TIMELINE_WINDOW_DAYS = 14;
export const TIMELINE_PAGE_SIZE = 100;
export const TIMELINE_SORT = "dueDate:asc_createdAt:asc";

export interface TimelineWindow {
  range: CalendarRange;
  tasks: Task[];
}

export interface TimelineDay {
  key: string;
  date: Date;
  tasks: Task[];
}

export function getTimelineWindow(anchor: Date, offset: number): CalendarRange {
  const start = addDays(anchor, offset);
  const end = endOfDay(addDays(start, TIMELINE_WINDOW_DAYS - 1));
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export async function loadTimelineWindow(
  anchor: Date,
  offset: number,
  signal?: AbortSignal,
): Promise<TimelineWindow> {
  const range = getTimelineWindow(anchor, offset);
  const tasks: Task[] = [];
  let pageNo = 1;
  let totalPage = 1;

  while (pageNo <= totalPage) {
    const response = await taskService.getAllTasks(
      {
        startDate: range.startIso,
        endDate: range.endIso,
        pageNo,
        pageSize: TIMELINE_PAGE_SIZE,
        sort: TIMELINE_SORT,
      },
      { signal },
    );

    const rows = Array.isArray(response?.data) ? response.data : [];
    for (const task of rows) {
      if (taskHasDueDateInRange(task, range)) {
        tasks.push(task);
      }
    }

    const reportedTotalPage = response?.pageInfo?.totalPage;
    totalPage =
      typeof reportedTotalPage === "number" && reportedTotalPage >= 1
        ? reportedTotalPage
        : 1;
    pageNo += 1;
  }

  return { range, tasks };
}

export function formatLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function groupTimelineTasks(
  windows: readonly TimelineWindow[],
): TimelineDay[] {
  const uniqueTasks: Array<{ task: Task; id: string; dueTime: number }> = [];
  const seenIds = new Set<string>();

  for (const window of windows) {
    for (const task of window.tasks) {
      const id = task._id || task.id || "";
      if (!id || seenIds.has(id) || !task.dueDate) continue;
      const dueTime = new Date(task.dueDate).getTime();
      if (Number.isNaN(dueTime)) continue;
      seenIds.add(id);
      uniqueTasks.push({ task, id, dueTime });
    }
  }

  uniqueTasks.sort((left, right) => {
    if (left.dueTime !== right.dueTime) {
      return left.dueTime - right.dueTime;
    }
    if (left.id < right.id) return -1;
    if (left.id > right.id) return 1;
    return 0;
  });

  const groups: TimelineDay[] = [];
  const groupsByKey = new Map<string, TimelineDay>();

  for (const { task, dueTime } of uniqueTasks) {
    const dayDate = startOfDay(dueTime);
    const key = formatLocalDayKey(dayDate);
    let group = groupsByKey.get(key);
    if (!group) {
      group = { key, date: dayDate, tasks: [] };
      groupsByKey.set(key, group);
      groups.push(group);
    }
    group.tasks.push(task);
  }

  return groups;
}
