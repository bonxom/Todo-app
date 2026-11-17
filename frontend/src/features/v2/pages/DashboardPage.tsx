import { useTranslation } from "react-i18next";
import TaskEditor from "../components/TaskEditor";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDashboardModel } from "../hooks/useDashboardModel";
import DashboardSummary from "../components/DashboardSummary";
import TaskToolbar from "../components/TaskToolbar";
import TaskCollection from "../components/TaskCollection";
import TaskPagination from "../components/TaskPagination";
import TaskDetailsDialog from "../components/TaskDetailsDialog";

export default function DashboardPage() {
  const { t } = useTranslation("v2");
  const [isCreating, setIsCreating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTaskId = searchParams.get("taskId");

  const {
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
  } = useDashboardModel();

  const handleOpenTask = (taskId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("taskId", taskId);
      return next;
    });
  };

  const handleCloseTask = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("taskId");
        return next;
      },
      { replace: true },
    );
  };

  const hasActiveFilters = Boolean(searchDraft || status);
  const tasksData = tasksQuery.data?.data;
  const pageInfo = tasksQuery.data?.pageInfo;

  useEffect(() => {
    if (pageInfo && pageInfo.totalPage > 0 && pageNo > pageInfo.totalPage) {
      setPageNo(pageInfo.totalPage);
    }
  }, [pageInfo, pageNo, setPageNo]);

  return (
    <div data-testid="v2-dashboard-page" className="v2-dashboard">
      <h1 className="sr-only">{t("dashboard")}</h1>
      {/* Summary Statistics */}
      <DashboardSummary
        stats={statsQuery.data}
        isLoading={statsQuery.isLoading}
        isError={statsQuery.isError}
      />

      <section className="v2-workspace-panel">
        {/* Toolbar */}
        <TaskToolbar
          searchDraft={searchDraft}
          onSearchChange={setSearchDraft}
          onSubmitSearch={submitSearch}
          status={status}
          onStatusChange={setStatus}
          onCreate={() => setIsCreating(true)}
        />

        {/* Task List */}
        <TaskCollection
          tasks={tasksData}
          isLoading={tasksQuery.isLoading}
          isError={tasksQuery.isError}
          error={tasksQuery.error}
          onRetry={() => void tasksQuery.refetch()}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          onOpenTask={handleOpenTask}
          onCreate={() => setIsCreating(true)}
        />

        {/* Pagination */}
        {pageInfo && pageInfo.totalPage > 1 && (
          <TaskPagination
            pageNo={pageNo}
            totalPage={pageInfo.totalPage}
            onPageChange={setPageNo}
            disabled={tasksQuery.isFetching}
          />
        )}
      </section>
      {isCreating && (
        <TaskEditor
          onCancel={() => setIsCreating(false)}
          onSaved={() => setIsCreating(false)}
        />
      )}
      {/* Details Dialog */}
      {selectedTaskId && (
        <TaskDetailsDialog taskId={selectedTaskId} onClose={handleCloseTask} />
      )}
    </div>
  );
}
