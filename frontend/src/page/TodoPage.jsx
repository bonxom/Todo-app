import { useCallback, useEffect, useMemo, useState } from 'react';
import MainLayout from '../layout/MainLayout';
import ActionButtons from '../feature/Todo/GenTaskButton';
import AddTaskButton from '../feature/Todo/AddTaskButton';
import TaskDetailButton from '../feature/Todo/TaskDetailButton';
import SearchBar from '../feature/Todo/SearchBar';
import TaskSelector from '../feature/Todo/TaskSelector';
import TaskList from '../feature/Todo/TaskList';
import ProgressBar from '../feature/Todo/ProgressBar';
import ProjectOverviewGrid from '../feature/Todo/ProjectOverviewGrid';
import ChatBubble from '../component/ChatBuble';
import AddCategoryForm from '../feature/Todo/Form/AddCategoryForm';
import AddProjectForm from '../feature/Todo/Form/AddProjectForm';
import { taskService, projectService } from '../api/apiService';
import { useTaskRefresh } from '../context/useTaskRefresh';
import { useTaskFilter, useVisibleTasks } from '../context/useTaskFilter';
import { toggleTaskCompletion } from '../utils/taskCompletion';
import { X } from 'lucide-react';

const ALL_PROJECT_FILTER = 'all-projects';
const STANDALONE_PROJECT_FILTER = 'standalone-projects';
const DEFAULT_STATUS_FILTERS = ['pending', 'in-progress', 'completed', 'given-up'];

const sortTasksByDueDate = (taskList) => {
  return [...taskList].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
};

const TodoPage = () => {
  const { refreshTrigger } = useTaskRefresh();
  const { onlyInProgress } = useTaskFilter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isGiveUpModalOpen, setIsGiveUpModalOpen] = useState(false);
  const [taskToGiveUp, setTaskToGiveUp] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(DEFAULT_STATUS_FILTERS);
  const [selectedProjectId, setSelectedProjectId] = useState(ALL_PROJECT_FILTER);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [projects, setProjects] = useState([]);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [initialTaskProjectId, setInitialTaskProjectId] = useState('');

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (
      isGiveUpModalOpen ||
      isDeleteModalOpen ||
      isAddCategoryModalOpen ||
      isAddProjectModalOpen
    ) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [
    isGiveUpModalOpen,
    isDeleteModalOpen,
    isAddCategoryModalOpen,
    isAddProjectModalOpen,
  ]);

  const fetchTasksAndProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const [taskResponse, projectResponse] = await Promise.all([
        taskService.getAllTasks(),
        projectService.getAllProjects(),
      ]);

      const tasksData = Array.isArray(taskResponse) ? taskResponse : taskResponse.tasks || [];
      setTasks(sortTasksByDueDate(tasksData));
      setProjects(projectResponse || []);
    } catch (error) {
      console.error('Failed to fetch Todo data:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to load tasks or projects.');
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchTasksAndProjects();
  }, [fetchTasksAndProjects, refreshTrigger]);

  const visibleTasks = useVisibleTasks(tasks);

  const handleToggleComplete = async (taskId) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      
      if (!task) return;

      await toggleTaskCompletion(task);
      await fetchTasksAndProjects();
    } catch (error) {
      console.error('Failed to toggle task:', error);
      alert(error.response?.data?.message || 'Failed to update task. Please try again.');
    }
  };

  const handleStart = async (taskId) => {
    try {
      await taskService.startTask(taskId);
      await fetchTasksAndProjects();
    } catch (error) {
      console.error('Failed to start task:', error);
      alert(error.response?.data?.message || 'Failed to start task. Please try again.');
    }
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const openAddTask = (projectId = '') => {
    setInitialTaskProjectId(projectId);
    setIsModalOpen(true);
  };

  const handleGiveUp = async (taskId) => {
    setTaskToGiveUp(taskId);
    setIsGiveUpModalOpen(true);
  };

  const confirmGiveUp = async () => {
    try {
      await taskService.giveUpTask(taskToGiveUp);
      await fetchTasksAndProjects();
      setIsGiveUpModalOpen(false);
      setTaskToGiveUp(null);
    } catch (error) {
      console.error('Failed to give up task:', error);
      alert(error.response?.data?.message || 'Failed to give up task. Please try again.');
    }
  };

  const handleDelete = async (taskId) => {
    setTaskToDelete(taskId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await taskService.deleteTask(taskToDelete);
      await fetchTasksAndProjects();
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const filteredTasks = useMemo(() => {
    return visibleTasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus.includes(task.status);
      const taskProjectId = task.projectId?._id || task.projectId || null;
      const matchesProject = selectedProjectId === ALL_PROJECT_FILTER
        ? true
        : selectedProjectId === STANDALONE_PROJECT_FILTER
          ? !taskProjectId
          : taskProjectId === selectedProjectId;

      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [visibleTasks, searchTerm, selectedStatus, selectedProjectId]);

  const overallSummary = useMemo(() => {
    const completed = visibleTasks.filter((task) => task.status === 'completed').length;

    return {
      completed,
      total: visibleTasks.length,
    };
  }, [visibleTasks]);

  const visibleSummary = useMemo(() => {
    const completed = filteredTasks.filter((task) => task.status === 'completed').length;

    return {
      completed,
      total: filteredTasks.length,
    };
  }, [filteredTasks]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId === ALL_PROJECT_FILTER || selectedProjectId === STANDALONE_PROJECT_FILTER) {
      return null;
    }

    return projects.find((project) => project._id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const taskListEmptyState = useMemo(() => {
    if (searchTerm.trim()) {
      return {
        title: 'No tasks match this search',
        description: 'Try a shorter title search or clear the project and status filters.',
      };
    }

    if (selectedProjectId === STANDALONE_PROJECT_FILTER) {
      return {
        title: 'No standalone tasks found',
        description: 'Create a task without selecting a project, or switch back to all tasks.',
      };
    }

    if (selectedProject) {
      return {
        title: `No tasks in ${selectedProject.name}`,
        description: 'Assign tasks to this project from the add or edit task forms to track them here.',
      };
    }

    if (selectedStatus.length !== DEFAULT_STATUS_FILTERS.length) {
      return {
        title: 'No tasks match these statuses',
        description: 'Adjust the status filter to bring other tasks back into view.',
      };
    }

    if (onlyInProgress) {
      return {
        title: 'No in-progress tasks visible',
        description: 'Turn off the global in-progress filter to see completed, pending, and given-up tasks.',
      };
    }

    return {
      title: 'No tasks yet',
      description: 'Add your first task to start building a daily list and project progress.',
    };
  }, [onlyInProgress, searchTerm, selectedProject, selectedProjectId, selectedStatus.length]);

  const projectCards = useMemo(() => {
    const buildSummary = (projectId) => {
      const projectTasks = visibleTasks.filter((task) => {
        const taskProjectId = task.projectId?._id || task.projectId || null;
        return projectId === STANDALONE_PROJECT_FILTER ? !taskProjectId : taskProjectId === projectId;
      });

      return {
        total: projectTasks.length,
        completed: projectTasks.filter((task) => task.status === 'completed').length,
      };
    };

    const allCard = {
      id: ALL_PROJECT_FILTER,
      eyebrow: 'Overview',
      name: 'All Tasks',
      description: 'See every task across standalone work and project-based work.',
      ...overallSummary,
      progressLabel: 'Overall completion',
      emptyLabel: 'No tasks yet',
    };

    const projectItems = projects.map((project) => {
      const summary = buildSummary(project._id);

      return {
        id: project._id,
        isProject: true,
        eyebrow: 'Project',
        name: project.name,
        description: project.description || 'No description yet.',
        ...summary,
        progressLabel: `${project.name} progress`,
        emptyLabel: 'No tasks in this project yet',
      };
    });

    const standaloneSummary = buildSummary(STANDALONE_PROJECT_FILTER);
    const standaloneCard = {
      id: STANDALONE_PROJECT_FILTER,
      eyebrow: 'Flexible',
      name: 'Standalone',
      description: 'Tasks that stay outside a project but still belong in your daily list.',
      ...standaloneSummary,
      progressLabel: 'Standalone progress',
      emptyLabel: 'No standalone tasks right now',
    };

    return [allCard, ...projectItems, standaloneCard];
  }, [projects, visibleTasks, overallSummary]);

  if (isInitialLoad && isLoading) {
    return (
      <>
        <MainLayout>
          <div className="ui-page-shell flex min-h-full items-center justify-center">
            <div className="text-sm text-[var(--color-text-muted)]">Loading tasks…</div>
          </div>
        </MainLayout>
        <ChatBubble key="chat-bubble-stable" />
      </>
    );
  }

  return (
    <>
    <AddTaskButton
      isOpen={isModalOpen}
      onClose={() => {
        setIsModalOpen(false);
        setInitialTaskProjectId('');
      }}
      onTaskCreated={fetchTasksAndProjects}
      onProjectCreated={fetchTasksAndProjects}
      initialProjectId={initialTaskProjectId}
    />

    <TaskDetailButton
      isOpen={isEditModalOpen}
      task={selectedTask}
      onClose={() => {
        setIsEditModalOpen(false);
        setSelectedTask(null);
      }}
      onTaskUpdated={fetchTasksAndProjects}
      onProjectCreated={fetchTasksAndProjects}
    />

    <ChatBubble />

    <MainLayout>
      <div className="ui-page-shell">
        <header className="ui-page-header">
          <p className="ui-page-kicker">Workspace</p>
          <h1 className="ui-page-title">Todos</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="ui-chip ui-tabular">{visibleSummary.completed} completed</span>
            <span className="ui-chip ui-tabular">{visibleSummary.total} visible tasks</span>
            {selectedProject && (
              <span className="ui-chip ui-chip--accent">{selectedProject.name}</span>
            )}
          </div>
        </header>

        {errorMessage ? (
          <section className="ui-section-card ui-card-padding">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-warning)]">Unable to refresh the latest todo data</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={fetchTasksAndProjects}
                className="ui-btn-secondary"
              >
                Retry
              </button>
            </div>
          </section>
        ) : null}

        <ActionButtons 
          onAddTask={() => openAddTask()} 
          onAddCategory={() => setIsAddCategoryModalOpen(true)}
          onAddProject={() => setIsAddProjectModalOpen(true)}
        />

        <ProjectOverviewGrid
          items={projectCards}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onCreateProject={() => setIsAddProjectModalOpen(true)}
          onAddTaskToProject={openAddTask}
        />

        <div className="flex flex-col gap-5">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          <TaskSelector 
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
          />
        </div>

        <TaskList
          tasks={filteredTasks}
          isLoading={isLoading && !isInitialLoad}
          emptyState={taskListEmptyState}
          onToggleComplete={handleToggleComplete}
          onEdit={handleEdit}
          onStart={handleStart}
          onGiveUp={handleGiveUp}
          onDelete={handleDelete}
        />

        <ProgressBar
          title={selectedProject ? `${selectedProject.name}` : 'Overall progress'}
          completed={visibleSummary.completed}
          total={visibleSummary.total}
          emptyLabel={selectedProject ? 'No tasks in this project yet' : 'No tasks yet'}
        />
      </div>
    </MainLayout>
    
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
              Are you sure you want to give up this task? You are choosing not to continue working on it.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setIsGiveUpModalOpen(false); setTaskToGiveUp(null); }} className="ui-btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={confirmGiveUp} className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning)] px-4 text-sm font-semibold text-white transition-[background-color,border-color] duration-150 hover:opacity-90">Give Up</button>
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
              <button type="button" onClick={() => { setIsDeleteModalOpen(false); setTaskToDelete(null); }} className="ui-btn-secondary flex-1">Cancel</button>
              <button type="button" onClick={confirmDelete} className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)] px-4 text-sm font-semibold text-white transition-[background-color,border-color] duration-150 hover:opacity-90">Delete</button>
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
              className="ui-modal-close-button"
              aria-label="Close add category dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="ui-modal-body">
            <AddCategoryForm
              onClose={() => setIsAddCategoryModalOpen(false)}
              onCategoryCreated={() => {
                setIsAddCategoryModalOpen(false);
              }}
            />
          </div>
        </div>
      </div>
    )}

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
              className="ui-modal-close-button"
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
                fetchTasksAndProjects();
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
