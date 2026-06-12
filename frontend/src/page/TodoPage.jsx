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
import GiveUpDialog from '../feature/Dialog/GiveUpDialog';
import NotInProgressDialog from '../feature/Dialog/NotInProgressDialog';
import DeleteDialog from '../feature/Dialog/DeleteDialog';
import { taskService, projectService } from '../api/apiService';
import { useTaskRefresh } from '../context/useTaskRefresh';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isGiveUpModalOpen, setIsGiveUpModalOpen] = useState(false);
  const [taskToGiveUp, setTaskToGiveUp] = useState(null);
  const [isNotInProgressModalOpen, setIsNotInProgressModalOpen] = useState(false);

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
      isNotInProgressModalOpen ||
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
    isNotInProgressModalOpen,
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

  const handleToggleComplete = async (taskId) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      
      if (!task) return;
      
      // If task is already completed, do nothing
      if (task.status === 'completed') return;
      
      // If task is not in-progress, show warning
      if (task.status !== 'in-progress') {
        setIsNotInProgressModalOpen(true);
        return;
      }
      
      // If task is in-progress, mark it as finished
      await taskService.finishTask(taskId);
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
    return tasks.filter((task) => {
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
  }, [tasks, searchTerm, selectedStatus, selectedProjectId]);

  const overallSummary = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'completed').length;

    return {
      completed,
      total: tasks.length,
    };
  }, [tasks]);

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

    return {
      title: 'No tasks yet',
      description: 'Add your first task to start building a daily list and project progress.',
    };
  }, [searchTerm, selectedProject, selectedProjectId, selectedStatus.length]);

  const projectCards = useMemo(() => {
    const buildSummary = (projectId) => {
      const projectTasks = tasks.filter((task) => {
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
      badgeClassName: 'bg-indigo-100 text-indigo-700',
      accentClassName: 'from-indigo-500 to-purple-600',
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
        description: project.description || 'No description yet. Use this space to capture the goal of the work.',
        ...summary,
        badgeClassName: 'bg-sky-100 text-sky-700',
        accentClassName: 'from-sky-500 to-cyan-600',
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
      badgeClassName: 'bg-slate-100 text-slate-700',
      accentClassName: 'from-slate-500 to-slate-700',
      progressLabel: 'Standalone progress',
      emptyLabel: 'No standalone tasks right now',
    };

    return [allCard, ...projectItems, standaloneCard];
  }, [projects, tasks, overallSummary]);

  if (isInitialLoad && isLoading) {
    return (
      <>
        <MainLayout>
          <div className="flex justify-center items-center min-h-full">
            <div className="text-gray-500">Loading tasks...</div>
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

    <GiveUpDialog
      isOpen={isGiveUpModalOpen}
      onClose={() => {
        setIsGiveUpModalOpen(false);
        setTaskToGiveUp(null);
      }}
      onConfirm={confirmGiveUp}
    />

    <NotInProgressDialog
      isOpen={isNotInProgressModalOpen}
      onClose={() => setIsNotInProgressModalOpen(false)}
    />

    <DeleteDialog
      isOpen={isDeleteModalOpen}
      onClose={() => {
        setIsDeleteModalOpen(false);
        setTaskToDelete(null);
      }}
      onConfirm={confirmDelete}
    />
      
      <MainLayout>
      <div className="flex justify-center items-start min-h-full p-6">
        <div className="w-full max-w-6xl mx-auto bg-gray-100/50 backdrop-blur-sm rounded-[28px] shadow-lg p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="flex justify-center text-3xl font-bold mb-3 bg-gradient-to-r bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              My Todo App
            </h1> 
            <p className="flex justify-center text-gray-500 mb-2">Stay organized and productive</p>
            <div className="flex justify-center gap-2 text-sm text-gray-500">
              <span>{visibleSummary.completed} completed</span>
              <span>·</span>
              <span>{visibleSummary.total} visible tasks</span>
              {selectedProject && (
                <>
                  <span>·</span>
                  <span>{selectedProject.name}</span>
                </>
              )}
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-6 rounded-[1.6rem] border border-amber-200 bg-amber-50/80 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-900">Unable to refresh the latest todo data</p>
                  <p className="mt-1 text-sm text-amber-700">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={fetchTasksAndProjects}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300 bg-white px-4 text-sm font-medium text-amber-800 transition-all hover:bg-amber-100"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          <ActionButtons 
            onAddTask={() => openAddTask()} 
            onAddCategory={() => setIsAddCategoryModalOpen(true)}
            onAddProject={() => setIsAddProjectModalOpen(true)}
          />

          <div className="mb-6">
            <ProjectOverviewGrid
              items={projectCards}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              onCreateProject={() => setIsAddProjectModalOpen(true)}
              onAddTaskToProject={openAddTask}
            />
          </div>

          <div className="flex flex-col gap-6 my-6">
            <div>
              <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            </div>
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

          <div className="mt-6">
            <ProgressBar
              title={selectedProject ? `${selectedProject.name} progress` : 'Overall progress'}
              completed={visibleSummary.completed}
              total={visibleSummary.total}
              accentClassName={selectedProject ? 'from-sky-500 to-cyan-600' : 'from-blue-500 to-purple-600'}
              emptyLabel={selectedProject ? 'No tasks in this project yet' : 'No tasks yet'}
            />
          </div>
        </div>
      </div>
    </MainLayout>
    
    {/* Add Category Modal */}
    {isAddCategoryModalOpen && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Add New Category</h2>
          </div>
          <div className="p-6">
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Add New Project</h2>
          </div>
          <div className="p-6">
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

    <ChatBubble />
  </>
  );
};

export default TodoPage;
