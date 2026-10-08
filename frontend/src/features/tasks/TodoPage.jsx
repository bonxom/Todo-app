import FormDialog from "@/shared/components/FormDialog";
import { createElement, useEffect, useMemo, useState } from "react";
import AddTaskButton from "./components/AddTaskButton";
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
    ? getApiErrorMessage(tasksQuery.error, "Failed to load tasks.")
    : projectsQuery.isError
      ? getApiErrorMessage(projectsQuery.error, "Failed to load projects.")
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
      alert(getApiErrorMessage(err, "Failed to accept task."));
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await finishTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to complete task."));
    }
  };

  const handleRestoreTask = async (taskId) => {
    try {
      await restoreTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to restore task."));
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
      alert(getApiErrorMessage(err, "Failed to give up task."));
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
      alert(getApiErrorMessage(err, "Failed to delete task."));
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
      alert(getApiErrorMessage(err, "Failed to complete project."));
    }
  };

  const handleRestoreProject = async (projectId) => {
    try {
      await updateProjectMutation.mutateAsync({
        projectId,
        payload: { status: PROJECT_STATUS.ACTIVE },
      });
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to restore project."));
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
        title: "No tasks match current filters",
        description:
          "Try adjusting your search query, status filters, or project selection.",
        isFiltered: true,
      };
    }
    return {
      title: "No tasks in this workspace yet",
      description:
        "Add your first task to start building your daily list and project progress.",
      isFiltered: false,
    };
  }, [isFiltered]);

  return (
    <>
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
          <h1 className="ui-page-title">Todos</h1>
          <button
            type="button"
            onClick={() => openAddTask(selectedProject?._id)}
            className="ui-btn-primary ui-page-add-button"
          >
            <Plus size={17} /> Add task
          </button>
        </header>

        <section className="todo-overview" aria-label="Workspace overview">
          <div className="todo-overview-intro">
            <div className="todo-orbit-art" aria-hidden="true">
              <i />
              <i />
              <i />
              <span>✦</span>
            </div>
            <div>
              <p className="todo-eyebrow">ONE THING AT A TIME</p>
              <h2>
                Small steps.
                <br />
                <em>Real progress.</em>
              </h2>
            </div>
          </div>
          {[
            {
              label: "Total tasks",
              value: stats?.totalTasks,
              icon: ListTodo,
              status: "",
              note: "Everything in one place",
            },
            {
              label: "In progress",
              value: stats?.inProgressTasks,
              icon: CircleDot,
              status: "in-progress",
              note: "Keep the momentum going",
            },
            {
              label: "Completed",
              value: stats?.completedTasks,
              icon: Check,
              status: "completed",
              note: "A little closer to your goals",
            },
          ].map(({ label, value, icon, status, note }) => (
            <button
              className="todo-stat"
              key={label}
              onClick={() => setSelectedStatuses(status ? [status] : [])}
              aria-label={`Show ${label.toLowerCase()}`}
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
                  Unable to load latest todo data
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
                Retry
              </button>
            </div>
          </section>
        )}

        {/* 2-Column Responsive Layout: Task Workspace (65-70%) vs Project Rail (30-35%, min 320px) */}
        <div className="todo-workspace">
          {/* Left Column: Main Task Workspace (~65–70%) */}
          <section className="todo-task-panel" aria-label="Your tasks">
            <div className="todo-panel-heading">
              <div>
                <h2>
                  {selectedProject?.name ||
                    (selectedProjectId === STANDALONE_PROJECT_FILTER
                      ? "Standalone tasks"
                      : "My tasks")}
                </h2>
                <span>Your next steps, all in one place.</span>
              </div>
              <span className="todo-result-count" aria-live="polite">
                {isLoading
                  ? "Loading…"
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
                  ? "Standalone tasks"
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
                Give Up Task
              </h2>
            </div>
            <div className="ui-modal-body">
              <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
                Are you sure you want to give up this task? You can restore it
                to in-progress at any time.
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
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmGiveUp}
                  className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning)] px-4 text-sm font-semibold text-[var(--color-on-status,#fff)] hover:opacity-90 cursor-pointer"
                >
                  Give Up
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
                Delete Task
              </h2>
            </div>
            <div className="ui-modal-body">
              <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
                Are you sure you want to delete this task? This action cannot be
                undone.
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
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)] px-4 text-sm font-semibold text-[var(--color-on-status,#fff)] hover:opacity-90 cursor-pointer"
                >
                  Delete
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
        title="Add Category"
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
        title="Add Project"
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
