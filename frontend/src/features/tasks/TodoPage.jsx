import { useTranslation } from "react-i18next";
import FormDialog from "@/shared/components/FormDialog";
import { createElement, useEffect, useMemo, useState } from "react";
import AddTaskButton from "./components/AddTaskButton";
import TaskDeepLink from "./components/TaskDeepLink";
import TaskDetailButton from "./components/TaskDetailButton";
import TodoTaskToolbar from "./components/TodoTaskToolbar";
import TaskList from "./components/TaskList";
import ProjectFocusRail from "./components/ProjectFocusRail";
import AddCategoryForm from "./components/Form/AddCategoryForm";
import AddProjectForm from "./components/Form/AddProjectForm";
import Pagination from "@/shared/components/Pagination";
import { useTasksQuery } from "./api/taskQueries";
import { useProjectsQuery } from "./api/projectQueries";
import {
  useDeleteTaskMutation,
  useFinishTaskMutation,
  useGiveUpTaskMutation,
  useRestoreTaskMutation,
  useStartTaskMutation,
} from "./api/taskMutations";
import { useUpdateProjectMutation } from "./api/projectMutations";
import { useTaskFilter } from "@/stores/useTaskFilterStore";
import { usePagination } from "@/shared/hooks/usePagination";
import { PROJECT_STATUS } from "@/shared/utils/projectStatus";
import { getApiErrorMessage } from "@/shared/services/apiError";
import {
  ArrowUpRight,
  Check,
  CircleDot,
  ListTodo,
  Plus,
  X,
} from "lucide-react";
import { useStatsQuery } from "@/features/statistics/api/statQueries";
import "./todos.css";

const ALL_PROJECT_FILTER = "all-projects";
const STANDALONE_PROJECT_FILTER = "standalone-projects";

const TodoPage = () => {
  const { t } = useTranslation("workspace");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isGiveUpModalOpen, setIsGiveUpModalOpen] = useState(false);
  const [taskToGiveUp, setTaskToGiveUp] = useState(null);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [initialTaskProjectId, setInitialTaskProjectId] = useState("");
  const statsQuery = useStatsQuery();

  // Global status filter from Topbar
  const { selectedStatuses, setSelectedStatuses } = useTaskFilter();

  // Local filter & sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectId, setSelectedProjectId] =
    useState(ALL_PROJECT_FILTER);
  const [sortBy, setSortBy] = useState("dueDate");
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);

  // Pagination — auto-resets to page 1 when search/filter/sort changes
  const {
    pageNo,
    pageSize,
    setPageNo,
    setPageSize,
    syncPageInfo,
    totalCount,
    totalPage,
  } = usePagination({
    initialPageSize: 10,
    resetDeps: [searchTerm, selectedStatuses, sortBy, selectedProjectId],
  });

  // Build sort string for server
  const sortParam = useMemo(() => {
    const SORT_MAP = {
      dueDate: "dueDate:asc_createdAt:desc",
      priority: "priority:desc_dueDate:asc",
      title: "title:asc",
    };
    return SORT_MAP[sortBy] || SORT_MAP.dueDate;
  }, [sortBy]);

  // Queries & Mutations — server-side filtering + pagination
  const tasksQuery = useTasksQuery({
    pageNo,
    pageSize,
    sort: sortParam,
    search: searchTerm.trim() || undefined,
    status: selectedStatuses[0] || undefined,
    projectId:
      selectedProjectId === ALL_PROJECT_FILTER
        ? undefined
        : selectedProjectId === STANDALONE_PROJECT_FILTER
          ? "standalone"
          : selectedProjectId,
  });
  const projectsQuery = useProjectsQuery();

  const startTaskMutation = useStartTaskMutation();
  const finishTaskMutation = useFinishTaskMutation();
  const giveUpTaskMutation = useGiveUpTaskMutation();
  const restoreTaskMutation = useRestoreTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const updateProjectMutation = useUpdateProjectMutation();

  // Extract paginated data
  const rawTasks = useMemo(
    () => tasksQuery.data?.data || [],
    [tasksQuery.data],
  );
  const pageInfo = tasksQuery.data?.pageInfo;
  const projects = useMemo(
    () => projectsQuery.data || [],
    [projectsQuery.data],
  );

  // Sync server pageInfo into usePagination state
  useEffect(() => {
    if (pageInfo) syncPageInfo(pageInfo);
  }, [pageInfo, syncPageInfo]);

  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading;
  const errorMessage = tasksQuery.isError
    ? getApiErrorMessage(tasksQuery.error, t("failedToLoadTasks"))
    : projectsQuery.isError
      ? getApiErrorMessage(projectsQuery.error, t("failedToLoadProjects"))
      : "";

  // Lock body scroll on modals
  useEffect(() => {
    if (!isGiveUpModalOpen && !isDeleteModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isGiveUpModalOpen, isDeleteModalOpen]);

  const stats = statsQuery.data;
  const completedCount = stats?.completedTasks ?? 0;
  const completion = stats?.totalTasks
    ? Math.round((completedCount / stats.totalTasks) * 100)
    : 0;

  const selectedProject = useMemo(() => {
    if (
      selectedProjectId === ALL_PROJECT_FILTER ||
      selectedProjectId === STANDALONE_PROJECT_FILTER
    ) {
      return null;
    }
    return projects.find((p) => p._id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Handlers for Task Actions (Calendar-aligned)
  const handleAcceptTask = async (taskId) => {
    try {
      await startTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, t("failedToAcceptTask")));
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await finishTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, t("failedToCompleteTask")));
    }
  };

  const handleRestoreTask = async (taskId) => {
    try {
      await restoreTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, t("failedToRestoreTask")));
    }
  };

  const handleGiveUpClick = (taskId) => {
    setTaskToGiveUp(taskId);
    setIsGiveUpModalOpen(true);
  };

  const confirmGiveUp = async () => {
    try {
      await giveUpTaskMutation.mutateAsync(taskToGiveUp);
      setIsGiveUpModalOpen(false);
      setTaskToGiveUp(null);
    } catch (err) {
      alert(getApiErrorMessage(err, t("failedToGiveUpTask")));
    }
  };

  const handleDeleteClick = (taskId) => {
    setTaskToDelete(taskId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteTaskMutation.mutateAsync(taskToDelete);
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    } catch (err) {
      alert(getApiErrorMessage(err, t("failedToDeleteTask")));
    }
  };

  const handleCompleteProject = async (projectId) => {
    try {
      await updateProjectMutation.mutateAsync({
        projectId,
        payload: { status: PROJECT_STATUS.COMPLETED },
      });
      if (selectedProjectId === projectId) {
        setSelectedProjectId(ALL_PROJECT_FILTER);
      }
    } catch (err) {
      alert(getApiErrorMessage(err, t("failedToCompleteProject")));
    }
  };

  const handleRestoreProject = async (projectId) => {
    try {
      await updateProjectMutation.mutateAsync({
        projectId,
        payload: { status: PROJECT_STATUS.ACTIVE },
      });
    } catch (err) {
      alert(getApiErrorMessage(err, t("failedToRestoreProject")));
    }
  };

  const openAddTask = (projectId = "") => {
    const project = projects.find((p) => p._id === projectId);
    setInitialTaskProjectId(
      project?.status === PROJECT_STATUS.COMPLETED ? "" : projectId,
    );
    setIsModalOpen(true);
  };

  const isFiltered =
    Boolean(searchTerm.trim()) ||
    selectedStatuses.length > 0 ||
    selectedProjectId !== ALL_PROJECT_FILTER;
  const filteredTasks = rawTasks; // Filtering now happens server-side

  const emptyStateInfo = useMemo(() => {
    if (isFiltered) {
      return {
        title: t("noTasksMatchCurrentFilters"),
        description: t(
          "tryAdjustingYourSearchQueryStatusFiltersOrProjectSelection",
        ),
        isFiltered: true,
      };
    }
    return {
      title: t("noTasksInThisWorkspaceYet"),
      description: t(
        "addYourFirstTaskToStartBuildingYourDailyListAndProjectProgress",
      ),
      isFiltered: false,
    };
  }, [isFiltered, t]);

  return (
    <>
      <TaskDeepLink />
      <AddTaskButton
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setInitialTaskProjectId("");
        }}
        initialProjectId={initialTaskProjectId}
      />

      <TaskDetailButton
        themeClass="todo-shell"
        isOpen={isEditModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
      />

      <div className="ui-page-shell todo-page">
        <header className="ui-workspace-heading">
          <h1 className="ui-page-title">{t("todos")}</h1>
          <button
            type="button"
            onClick={() => openAddTask(selectedProject?._id)}
            className="ui-btn-primary ui-page-add-button"
          >
            <Plus size={17} /> {t("addTask")}
          </button>
        </header>

        <section className="todo-overview" aria-label={t("workspaceOverview")}>
          <div className="todo-overview-intro">
            <div className="todo-orbit-art" aria-hidden="true">
              <i />
              <i />
              <i />
              <span>✦</span>
            </div>
            <div>
              <p className="todo-eyebrow">{t("oneThingAtATime")}</p>
              <h2>
                {t("smallSteps")}
                <br />
                <em>{t("realProgress")}</em>
              </h2>
            </div>
          </div>
          {[
            {
              label: t("totalTasks"),
              value: stats?.totalTasks,
              icon: ListTodo,
              status: "",
              note: t("everythingInOnePlace"),
            },
            {
              label: t("inProgress"),
              value: stats?.inProgressTasks,
              icon: CircleDot,
              status: "in-progress",
              note: t("keepTheMomentumGoing"),
            },
            {
              label: t("completed"),
              value: stats?.completedTasks,
              icon: Check,
              status: "completed",
              note: t("aLittleCloserToYourGoals"),
            },
          ].map(({ label, value, icon, status, note }) => (
            <button
              className="todo-stat"
              key={label}
              onClick={() => setSelectedStatuses(status ? [status] : [])}
              aria-label={t("messages.showV0", { v0: label.toLowerCase() })}
            >
              <span className="todo-stat-label">
                {createElement(icon, { size: 15 })}
                {label}
                <ArrowUpRight size={14} />
              </span>
              <strong>{value ?? "—"}</strong>
              <span className="todo-stat-note">{note}</span>
            </button>
          ))}
        </section>

        {/* Error Banner */}
        {errorMessage && (
          <section className="ui-section-card ui-card-padding">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-warning)]">
                  {t("unableToLoadLatestTodoData")}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {errorMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  tasksQuery.refetch();
                  projectsQuery.refetch();
                }}
                className="ui-btn-secondary cursor-pointer"
              >
                {t("retry")}
              </button>
            </div>
          </section>
        )}

        {/* 2-Column Responsive Layout: Task Workspace (65-70%) vs Project Rail (30-35%, min 320px) */}
        <div className="todo-workspace">
          {/* Left Column: Main Task Workspace (~65–70%) */}
          <section className="todo-task-panel" aria-label={t("yourTasks")}>
            <div className="todo-panel-heading">
              <div>
                <h2>
                  {selectedProject?.name ||
                    (selectedProjectId === STANDALONE_PROJECT_FILTER
                      ? t("standaloneTasks")
                      : t("myTasks"))}
                </h2>
                <span>{t("yourNextStepsAllInOnePlace")}</span>
              </div>
              <span className="todo-result-count" aria-live="polite">
                {isLoading
                  ? t("loading")
                  : `${totalCount} ${totalCount === 1 ? "task" : "tasks"}`}
              </span>
            </div>
            <TodoTaskToolbar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              sortBy={sortBy}
              onSortChange={setSortBy}
              activeProjectName={
                selectedProject?.name ||
                (selectedProjectId === STANDALONE_PROJECT_FILTER
                  ? t("standaloneTasks")
                  : "")
              }
              onClearProjectFilter={() =>
                setSelectedProjectId(ALL_PROJECT_FILTER)
              }
            />

            <div
              className="todo-task-list-wrap"
              aria-busy={tasksQuery.isFetching}
            >
              <TaskList
                tasks={filteredTasks}
                isLoading={isLoading}
                emptyState={emptyStateInfo}
                onAccept={handleAcceptTask}
                onReject={deleteTaskMutation.mutateAsync}
                onComplete={handleCompleteTask}
                onGiveUp={handleGiveUpClick}
                onRestore={handleRestoreTask}
                onEdit={(task) => {
                  setSelectedTask(task);
                  setIsEditModalOpen(true);
                }}
                onDelete={handleDeleteClick}
                onAddTask={() => openAddTask(selectedProject?._id)}
                onClearFilters={() => {
                  setSearchTerm("");
                  setSelectedStatuses([]);
                  setSelectedProjectId(ALL_PROJECT_FILTER);
                }}
              />
            </div>

            {/* Pagination */}
            {totalPage > 0 && (
              <Pagination
                pageNo={pageNo}
                pageSize={pageSize}
                totalCount={totalCount}
                totalPage={totalPage}
                onPageChange={setPageNo}
                onPageSizeChange={setPageSize}
                className="mt-4"
              />
            )}
          </section>

          {/* Right Column: Sticky Project Focus Rail (~30–35%, min 320px) */}
          <div className="todo-right-column">
            <ProjectFocusRail
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              showCompletedProjects={showCompletedProjects}
              onShowCompletedProjectsChange={setShowCompletedProjects}
              onCreateProject={() => setIsAddProjectModalOpen(true)}
              onAddTaskToProject={openAddTask}
              onCompleteProject={handleCompleteProject}
              onRestoreProject={handleRestoreProject}
              isLoading={isLoading}
              completion={stats ? completion : null}
              completedCount={completedCount}
              totalCount={stats?.totalTasks ?? 0}
            />
          </div>
        </div>
      </div>

      {/* Give Up Dialog */}
      {isGiveUpModalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
          onClick={() => {
            setIsGiveUpModalOpen(false);
            setTaskToGiveUp(null);
          }}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-md animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="giveup-dialog-title"
          >
            <div className="ui-modal-header">
              <h2
                id="giveup-dialog-title"
                className="text-xl font-semibold text-[var(--color-text)]"
              >
                {t("giveUpTask")}
              </h2>
            </div>
            <div className="ui-modal-body">
              <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
                {t(
                  "areYouSureYouWantToGiveUpThisTaskYouCanRestoreItToInProgressAtAnyTime",
                )}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsGiveUpModalOpen(false);
                    setTaskToGiveUp(null);
                  }}
                  className="ui-btn-secondary flex-1 cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={confirmGiveUp}
                  className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning)] px-4 text-sm font-semibold text-[var(--color-on-status,#fff)] hover:opacity-90 cursor-pointer"
                >
                  {t("giveUp")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {isDeleteModalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
          onClick={() => {
            setIsDeleteModalOpen(false);
            setTaskToDelete(null);
          }}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-md animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="ui-modal-header">
              <h2
                id="delete-dialog-title"
                className="text-xl font-semibold text-[var(--color-text)]"
              >
                {t("deleteTask")}
              </h2>
            </div>
            <div className="ui-modal-body">
              <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
                {t("areYouSureYouWantToDeleteThisTaskThisActionCannotBeUndone")}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setTaskToDelete(null);
                  }}
                  className="ui-btn-secondary flex-1 cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)] px-4 text-sm font-semibold text-[var(--color-on-status,#fff)] hover:opacity-90 cursor-pointer"
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      <FormDialog
        isOpen={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        title={t("addCategory")}
        kind="category"
      >
        <AddCategoryForm
          onClose={() => setIsAddCategoryModalOpen(false)}
          onCategoryCreated={() => setIsAddCategoryModalOpen(false)}
        />
      </FormDialog>

      {/* Add Project Modal */}
      <FormDialog
        isOpen={isAddProjectModalOpen}
        onClose={() => setIsAddProjectModalOpen(false)}
        title={t("addProject")}
        kind="project"
      >
        <AddProjectForm
          onClose={() => setIsAddProjectModalOpen(false)}
          onProjectCreated={(project) => {
            setIsAddProjectModalOpen(false);
            setSelectedProjectId(project?._id || ALL_PROJECT_FILTER);
          }}
        />
      </FormDialog>
    </>
  );
};

export default TodoPage;
