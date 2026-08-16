import { useEffect, useMemo, useState } from 'react';
import AddTaskButton from './components/AddTaskButton';
import TaskDetailButton from './components/TaskDetailButton';
import TodoTaskToolbar from './components/TodoTaskToolbar';
import TaskList from './components/TaskList';
import ProjectFocusRail from './components/ProjectFocusRail';
import AddCategoryForm from './components/Form/AddCategoryForm';
import AddProjectForm from './components/Form/AddProjectForm';
import { useTasksQuery } from './api/taskQueries';
import { useProjectsQuery } from './api/projectQueries';
import {
  useDeleteTaskMutation,
  useFinishTaskMutation,
  useGiveUpTaskMutation,
  useRestoreTaskMutation,
  useStartTaskMutation,
} from './api/taskMutations';
import { useUpdateProjectMutation } from './api/projectMutations';
import { useTaskFilter } from '@/stores/useTaskFilterStore';
import { filterAndSortTasks } from './utils/taskFilterPipeline';
import { PROJECT_STATUS } from '@/shared/utils/projectStatus';
import { getApiErrorMessage } from '@/shared/services/apiError';
import { X } from 'lucide-react';

const ALL_PROJECT_FILTER = 'all-projects';
const STANDALONE_PROJECT_FILTER = 'standalone-projects';

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
  const [initialTaskProjectId, setInitialTaskProjectId] = useState('');

  // Global status filter from Topbar
  const { selectedStatuses, setSelectedStatuses } = useTaskFilter();

  // Local filter & sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(ALL_PROJECT_FILTER);
  const [sortBy, setSortBy] = useState('dueDate');
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);

  // Queries & Mutations
  const tasksQuery = useTasksQuery();
  const projectsQuery = useProjectsQuery();

  const startTaskMutation = useStartTaskMutation();
  const finishTaskMutation = useFinishTaskMutation();
  const giveUpTaskMutation = useGiveUpTaskMutation();
  const restoreTaskMutation = useRestoreTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const updateProjectMutation = useUpdateProjectMutation();

  const rawTasks = useMemo(() => tasksQuery.data || [], [tasksQuery.data]);
  const projects = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);

  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading;
  const errorMessage = tasksQuery.isError
    ? getApiErrorMessage(tasksQuery.error, 'Failed to load tasks.')
    : projectsQuery.isError
    ? getApiErrorMessage(projectsQuery.error, 'Failed to load projects.')
    : '';

  // Lock body scroll on modals
  useEffect(() => {
    const isAnyModalOpen = isGiveUpModalOpen || isDeleteModalOpen || isAddCategoryModalOpen || isAddProjectModalOpen;
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isGiveUpModalOpen, isDeleteModalOpen, isAddCategoryModalOpen, isAddProjectModalOpen]);

  // Pure filtering & sorting pipeline
  const filteredTasks = useMemo(() => {
    return filterAndSortTasks({
      tasks: rawTasks,
      searchTerm,
      selectedStatuses,
      selectedProjectId,
      sortBy,
    });
  }, [rawTasks, searchTerm, selectedStatuses, selectedProjectId, sortBy]);

  // Overall workspace counters (pure and stable)
  const remainingCount = useMemo(() => {
    return rawTasks.filter((t) => t.status === 'in-progress' || t.status === 'pending').length;
  }, [rawTasks]);

  const completedCount = useMemo(() => {
    return rawTasks.filter((t) => t.status === 'completed').length;
  }, [rawTasks]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId === ALL_PROJECT_FILTER || selectedProjectId === STANDALONE_PROJECT_FILTER) {
      return null;
    }
    return projects.find((p) => p._id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Handlers for Task Actions (Calendar-aligned)
  const handleAcceptTask = async (taskId) => {
    try {
      await startTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to accept task.'));
    }
  };

  const handleDenyTask = async (taskId) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to delete task.'));
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await finishTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to complete task.'));
    }
  };

  const handleRestoreTask = async (taskId) => {
    try {
      await restoreTaskMutation.mutateAsync(taskId);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to restore task.'));
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
      alert(getApiErrorMessage(err, 'Failed to give up task.'));
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
      alert(getApiErrorMessage(err, 'Failed to delete task.'));
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
      alert(getApiErrorMessage(err, 'Failed to complete project.'));
    }
  };

  const handleRestoreProject = async (projectId) => {
    try {
      await updateProjectMutation.mutateAsync({
        projectId,
        payload: { status: PROJECT_STATUS.ACTIVE },
      });
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to restore project.'));
    }
  };

  const openAddTask = (projectId = '') => {
    const project = projects.find((p) => p._id === projectId);
    setInitialTaskProjectId(project?.status === PROJECT_STATUS.COMPLETED ? '' : projectId);
    setIsModalOpen(true);
  };

  const isFiltered = Boolean(searchTerm.trim()) || selectedStatuses.length > 0 || selectedProjectId !== ALL_PROJECT_FILTER;

  const emptyStateInfo = useMemo(() => {
    if (isFiltered) {
      return {
        title: 'No tasks match current filters',
        description: 'Try adjusting your search query, status filters, or project selection.',
        isFiltered: true,
      };
    }
    return {
      title: 'No tasks in this workspace yet',
      description: 'Add your first task to start building your daily list and project progress.',
      isFiltered: false,
    };
  }, [isFiltered]);

  return (
    <>
      <AddTaskButton
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setInitialTaskProjectId('');
        }}
        initialProjectId={initialTaskProjectId}
      />

      <TaskDetailButton
        isOpen={isEditModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
      />

      <div className="ui-page-shell">
        {/* Main Page Header */}
        <header className="ui-page-header">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="ui-page-kicker">Workspace</p>
              <h1 className="ui-page-title">Today</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                <span className="ui-chip ui-chip--accent ui-tabular font-semibold">
                  {remainingCount} remaining
                </span>
                <span className="ui-chip ui-tabular">
                  {completedCount} completed
                </span>
                {selectedProject && (
                  <span className="ui-chip ui-chip--accent font-medium">
                    Focused on: {selectedProject.name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAddTask()}
                className="ui-btn-primary cursor-pointer"
              >
                + Add Task
              </button>
            </div>
          </div>
        </header>

        {/* Error Banner */}
        {errorMessage && (
          <section className="ui-section-card ui-card-padding">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-warning)]">Unable to load latest todo data</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{errorMessage}</p>
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
        <div className="flex flex-col-reverse lg:flex-row items-start gap-6">
          {/* Left Column: Main Task Workspace (~65–70%) */}
          <main className="w-full flex-1 min-w-0 space-y-4">
            <TodoTaskToolbar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              sortBy={sortBy}
              onSortChange={setSortBy}
              activeProjectName={selectedProject?.name}
              onClearProjectFilter={() => setSelectedProjectId(ALL_PROJECT_FILTER)}
            />

            <TaskList
              tasks={filteredTasks}
              isLoading={isLoading}
              emptyState={emptyStateInfo}
              onAccept={handleAcceptTask}
              onDeny={handleDenyTask}
              onComplete={handleCompleteTask}
              onGiveUp={handleGiveUpClick}
              onRestore={handleRestoreTask}
              onEdit={(task) => {
                setSelectedTask(task);
                setIsEditModalOpen(true);
              }}
              onDelete={handleDeleteClick}
              onClearFilters={() => {
                setSearchTerm('');
                setSelectedStatuses([]);
                setSelectedProjectId(ALL_PROJECT_FILTER);
              }}
            />
          </main>

          {/* Right Column: Sticky Project Focus Rail (~30–35%, min 320px) */}
          <div className="w-full lg:w-[22rem] xl:w-[24rem] shrink-0">
            <ProjectFocusRail
              projects={projects}
              rawTasks={rawTasks}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              showCompletedProjects={showCompletedProjects}
              onShowCompletedProjectsChange={setShowCompletedProjects}
              onCreateProject={() => setIsAddProjectModalOpen(true)}
              onCreateCategory={() => setIsAddCategoryModalOpen(true)}
              onAddTaskToProject={openAddTask}
              onCompleteProject={handleCompleteProject}
              onRestoreProject={handleRestoreProject}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Give Up Dialog */}
      {isGiveUpModalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
          onClick={() => { setIsGiveUpModalOpen(false); setTaskToGiveUp(null); }}
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
              <h2 id="giveup-dialog-title" className="text-xl font-semibold text-[var(--color-text)]">Give Up Task</h2>
            </div>
            <div className="ui-modal-body">
              <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
                Are you sure you want to give up this task? You can restore it to in-progress at any time.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setIsGiveUpModalOpen(false); setTaskToGiveUp(null); }} className="ui-btn-secondary flex-1 cursor-pointer">Cancel</button>
                <button type="button" onClick={confirmGiveUp} className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning)] px-4 text-sm font-semibold text-white hover:opacity-90 cursor-pointer">Give Up</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {isDeleteModalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
          onClick={() => { setIsDeleteModalOpen(false); setTaskToDelete(null); }}
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
              <h2 id="delete-dialog-title" className="text-xl font-semibold text-[var(--color-text)]">Delete Task</h2>
            </div>
            <div className="ui-modal-body">
              <p className="mb-6 text-sm leading-6 text-[var(--color-text-muted)]">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setIsDeleteModalOpen(false); setTaskToDelete(null); }} className="ui-btn-secondary flex-1 cursor-pointer">Cancel</button>
                <button type="button" onClick={confirmDelete} className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)] px-4 text-sm font-semibold text-white hover:opacity-90 cursor-pointer">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryModalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsAddCategoryModalOpen(false)}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-lg animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-cat-title"
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <div>
                <p className="ui-page-kicker">Create</p>
                <h2 id="add-cat-title" className="text-xl font-semibold text-[var(--color-text)]">Add Category</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="ui-modal-close-button cursor-pointer"
                aria-label="Close add category dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ui-modal-body">
              <AddCategoryForm
                onClose={() => setIsAddCategoryModalOpen(false)}
                onCategoryCreated={() => setIsAddCategoryModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {isAddProjectModalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsAddProjectModalOpen(false)}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-lg animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-proj-title"
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <div>
                <p className="ui-page-kicker">Create</p>
                <h2 id="add-proj-title" className="text-xl font-semibold text-[var(--color-text)]">Add Project</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProjectModalOpen(false)}
                className="ui-modal-close-button cursor-pointer"
                aria-label="Close add project dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ui-modal-body">
              <AddProjectForm
                onClose={() => setIsAddProjectModalOpen(false)}
                onProjectCreated={(project) => {
                  setIsAddProjectModalOpen(false);
                  setSelectedProjectId(project?._id || ALL_PROJECT_FILTER);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TodoPage;
