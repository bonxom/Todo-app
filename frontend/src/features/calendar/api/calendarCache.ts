import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { EntityId, Project, ProjectWithSummary, Task } from "../../../shared/types/domain";
import { taskKeys, type CalendarRangeParams } from "../../tasks/api/taskKeys";
import { projectKeys } from "../../tasks/api/projectKeys";

export const getTaskId = (task: Task | { _id?: EntityId; id?: EntityId } | null | undefined): EntityId | null =>
  task?._id || task?.id || null;

export interface CalendarSnapshot {
  taskQueries: Array<[QueryKey, Task[] | undefined]>;
  projectQueries: Array<[QueryKey, ProjectWithSummary[] | undefined]>;
}

export const snapshotTaskCollections = (client: QueryClient): Array<[QueryKey, Task[] | undefined]> => {
  return client.getQueriesData<Task[]>({ queryKey: taskKeys.calendarRoot() });
};

export const snapshotProjectList = (client: QueryClient): Array<[QueryKey, ProjectWithSummary[] | undefined]> => {
  return client.getQueriesData<ProjectWithSummary[]>({ queryKey: projectKeys.all });
};

export const createCalendarSnapshot = (client: QueryClient): CalendarSnapshot => ({
  taskQueries: snapshotTaskCollections(client),
  projectQueries: snapshotProjectList(client),
});

export const restoreSnapshot = (client: QueryClient, snapshot: CalendarSnapshot): void => {
  snapshot.taskQueries.forEach(([key, data]) => {
    client.setQueryData(key, data);
  });
  snapshot.projectQueries.forEach(([key, data]) => {
    client.setQueryData(key, data);
  });
};

const isDueDateInRange = (dueDateStr: string | null | undefined, range: CalendarRangeParams): boolean => {
  if (!dueDateStr) return false;
  const dueTime = new Date(dueDateStr).getTime();
  const startTime = new Date(range.startDate).getTime();
  const endTime = new Date(range.endDate).getTime();
  return !Number.isNaN(dueTime) && dueTime >= startTime && dueTime <= endTime;
};

export const upsertTaskInCollections = (client: QueryClient, nextTask: Task, previousId?: string): void => {
  const nextTaskId = getTaskId(nextTask);
  if (!nextTaskId) return;

  const queries = client.getQueriesData<Task[]>({ queryKey: taskKeys.calendarRoot() });

  queries.forEach(([queryKey, currentTasks]) => {
    if (!Array.isArray(currentTasks)) return;

    // Check if query key has range params
    const rangeParam = queryKey[2] as CalendarRangeParams | undefined;
    const shouldInclude = rangeParam && rangeParam.startDate && rangeParam.endDate
      ? isDueDateInRange(nextTask.dueDate, rangeParam)
      : Boolean(nextTask.dueDate);

    const filtered = currentTasks.filter((t) => {
      const id = getTaskId(t);
      return id !== nextTaskId && (!previousId || id !== previousId);
    });

    if (shouldInclude) {
      client.setQueryData<Task[]>(queryKey, [...filtered, nextTask]);
    } else {
      client.setQueryData<Task[]>(queryKey, filtered);
    }
  });
};

export const removeTaskFromCollections = (client: QueryClient, taskId: EntityId): void => {
  const queries = client.getQueriesData<Task[]>({ queryKey: taskKeys.calendarRoot() });

  queries.forEach(([queryKey, currentTasks]) => {
    if (!Array.isArray(currentTasks)) return;
    const filtered = currentTasks.filter((t) => getTaskId(t) !== taskId);
    client.setQueryData<Task[]>(queryKey, filtered);
  });
};

export const replaceProjectInList = (
  client: QueryClient,
  updatedProject: Project | Partial<Project> & { _id: EntityId }
): void => {
  const projectId = updatedProject._id;
  const queries = client.getQueriesData<ProjectWithSummary[]>({ queryKey: projectKeys.list() });

  queries.forEach(([queryKey, currentProjects]) => {
    if (!Array.isArray(currentProjects)) return;
    const updated = currentProjects.map((p) =>
      p._id === projectId ? ({ ...p, ...updatedProject } as ProjectWithSummary) : p
    );
    client.setQueryData<ProjectWithSummary[]>(queryKey, updated);
  });
};
