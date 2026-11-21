import { useState, useCallback, useMemo } from "react";
import { useTasksQuery } from "@/features/tasks/api/taskQueries";
import { useProjectsQuery } from "@/features/tasks/api/projectQueries";
import { useStatsQuery } from "@/features/statistics/api/statQueries";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { TaskStatus } from "@/shared/types/domain";

export function useDashboardModel() {
  const [searchDraft, setSearchDraft] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatusState] = useState<TaskStatus | "">(
    () => useSettingsStore.getState().workspace.defaultTaskStatus,
  );
  const [projectId, setProjectIdState] = useState<string>("");
  const [pageNo, setPageNo] = useState(1);

  const submitSearch = useCallback(() => {
    setSubmittedSearch(searchDraft.trim());
    setPageNo(1);
  }, [searchDraft]);

  const setStatus = useCallback((value: TaskStatus | "") => {
    setStatusState(value);
    setPageNo(1);
  }, []);

  const setProjectId = useCallback((value: string) => {
    setProjectIdState(value);
    setPageNo(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchDraft("");
    setSubmittedSearch("");
    setStatusState("");
    setProjectIdState("");
    setPageNo(1);
  }, []);

  const tasksQuery = useTasksQuery({
    pageNo,
    pageSize: 10,
    sort: "dueDate:asc_createdAt:desc",
    search: submittedSearch || undefined,
    status: (status as TaskStatus) || undefined,
    projectId: projectId || undefined,
  });

  const statsQuery = useStatsQuery();
  const projectsQuery = useProjectsQuery();

  const focusMetrics = useMemo(() => {
    const tasks = tasksQuery.data?.data ?? [];
    const now = tasksQuery.dataUpdatedAt;
    let overdueCount = 0;
    let highPriorityCount = 0;

    for (const task of tasks) {
      if (task.status === "completed" || task.status === "given-up") continue;
      const isOverdue =
        Boolean(task.isOverDue) ||
        (now > 0 &&
          Boolean(task.dueDate) &&
          new Date(task.dueDate!).getTime() < now);
      if (isOverdue) overdueCount += 1;
      if (task.priority === "High") highPriorityCount += 1;
    }

    return {
      overdueCount,
      highPriorityCount,
    };
  }, [tasksQuery.data?.data, tasksQuery.dataUpdatedAt]);

  return {
    searchDraft,
    setSearchDraft,
    submitSearch,
    status,
    setStatus,
    projectId,
    setProjectId,
    clearFilters,
    pageNo,
    setPageNo,
    tasksQuery,
    statsQuery,
    projectsQuery,
    focusMetrics,
  };
}
