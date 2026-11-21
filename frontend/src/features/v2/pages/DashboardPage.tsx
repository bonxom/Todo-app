import { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AgentSessionContext } from "@/features/agent/agentSessionContext";
import AddProjectForm from "@/features/tasks/components/Form/AddProjectForm";
import type { Project } from "@/shared/types/domain";
import TaskEditor from "../components/TaskEditor";
import { useDashboardModel } from "../hooks/useDashboardModel";
import DashboardSummary from "../components/DashboardSummary";
import DashboardFocusStrip from "../components/DashboardFocusStrip";
import DashboardChatNow from "../components/DashboardChatNow";
import DashboardProjectsRail from "../components/DashboardProjectsRail";
import TaskToolbar from "../components/TaskToolbar";
import TaskCollection from "../components/TaskCollection";
import TaskPagination from "../components/TaskPagination";
import TaskDetailsDialog from "../components/TaskDetailsDialog";
import V2Dialog from "../components/V2Dialog";

export default function DashboardPage() {
  const { t } = useTranslation("v2");
  const { t: tWorkspace } = useTranslation("workspace");
  const navigate = useNavigate();
  const agentSession = useContext(AgentSessionContext);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTaskId = searchParams.get("taskId");

  const {
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

  const handleQuickChatSend = (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    if (agentSession?.chat) {
      agentSession.chat.resetConversation?.(projectId || undefined);
      void agentSession.chat.send(trimmed);
    }
    navigate(
      projectId
        ? `/v2/agents?project=${encodeURIComponent(projectId)}`
        : "/v2/agents",
      {
        state: {
          assistantHandoff: true,
          entryTransition: "zoom-out",
        },
      },
    );
  };

  const hasActiveFilters = Boolean(searchDraft || status || projectId);
  const tasksData = tasksQuery.data?.data;
  const pageInfo = tasksQuery.data?.pageInfo;

  useEffect(() => {
    if (pageInfo && pageInfo.totalPage > 0 && pageNo > pageInfo.totalPage) {
      setPageNo(pageInfo.totalPage);
    }
  }, [pageInfo, pageNo, setPageNo]);

  return (
    <div data-testid="v2-dashboard-page" className="v2-dashboard flex flex-col">
      <h1 className="sr-only">{t("dashboard")}</h1>

      {/* Row 1: Summary Statistics */}
      <DashboardSummary
        stats={statsQuery.data}
        isLoading={statsQuery.isLoading}
        isError={statsQuery.isError}
        overdueCount={focusMetrics.overdueCount}
        highPriorityCount={focusMetrics.highPriorityCount}
      />

      {/* Row 2: Today's Focus Strip */}
      <DashboardFocusStrip
        stats={statsQuery.data}
        overdueCount={focusMetrics.overdueCount}
        highPriorityCount={focusMetrics.highPriorityCount}
        activeStatus={status}
        onSelectStatus={setStatus}
        onQuickChatSend={handleQuickChatSend}
      />

      {/* Row 3: Chat Now Launchpad */}
      <DashboardChatNow selectedProjectId={projectId || undefined} />

      {/* Row 4: Projects Progress Rail + Task Collection Workspace */}
      <div className="v2-dashboard-main-grid grid grid-cols-[256px_minmax(0,1fr)] items-start gap-[18px] [@container_workspace_(max-width:940px)]:grid-cols-1">
        <DashboardProjectsRail
          projects={projectsQuery.data}
          totalTasksCount={
            statsQuery.data?.totalTasks ?? pageInfo?.totalCount ?? 0
          }
          selectedProjectId={projectId}
          onSelectProject={setProjectId}
          onCreateProject={() => setShowCreateProject(true)}
        />

        <section className="v2-workspace-panel min-w-0 overflow-hidden">
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
      </div>

      {isCreating && (
        <TaskEditor
          onCancel={() => setIsCreating(false)}
          onSaved={() => setIsCreating(false)}
        />
      )}

      <V2Dialog
        open={showCreateProject}
        title={tWorkspace("addProjectCasedAddproject")}
        onClose={() => setShowCreateProject(false)}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto p-5"
      >
        <AddProjectForm
          onClose={() => setShowCreateProject(false)}
          onProjectCreated={(created: Project) => {
            setProjectId(created._id);
            setShowCreateProject(false);
          }}
          onProjectSaved={undefined}
        />
      </V2Dialog>

      {/* Details Dialog */}
      {selectedTaskId && (
        <TaskDetailsDialog taskId={selectedTaskId} onClose={handleCloseTask} />
      )}
    </div>
  );
}
