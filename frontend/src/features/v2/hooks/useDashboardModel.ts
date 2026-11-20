import { useState, useCallback } from "react";
import { useTasksQuery } from "@/features/tasks/api/taskQueries";
import { useStatsQuery } from "@/features/statistics/api/statQueries";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { TaskStatus } from "@/shared/types/domain";

export function useDashboardModel() {
  const [searchDraft, setSearchDraft] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatusState] = useState<TaskStatus | "">(
    () => useSettingsStore.getState().workspace.defaultTaskStatus,
  );
  const [pageNo, setPageNo] = useState(1);

  const submitSearch = useCallback(() => {
    setSubmittedSearch(searchDraft.trim());
    setPageNo(1);
  }, [searchDraft]);

  const setStatus = useCallback((value: TaskStatus | "") => {
    setStatusState(value);
    setPageNo(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchDraft("");
    setSubmittedSearch("");
    setStatusState("");
    setPageNo(1);
  }, []);

  const tasksQuery = useTasksQuery({
    pageNo,
    pageSize: 10,
    sort: "dueDate:asc_createdAt:desc",
    search: submittedSearch || undefined,
    status: (status as TaskStatus) || undefined,
  });

  const statsQuery = useStatsQuery();

  return {
    searchDraft,
    setSearchDraft,
    submitSearch,
    status,
    setStatus,
    clearFilters,
    pageNo,
    setPageNo,
    tasksQuery,
    statsQuery,
  };
}
