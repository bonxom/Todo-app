import { useState, useEffect, useMemo } from 'react';
import MainLayout from '../layout/MainLayout';
import ActionButtons from '../feature/Todo/GenTaskButton';
import AddTaskButton from '../feature/Todo/AddTaskButton';
import TaskDetailButton from '../feature/Todo/TaskDetailButton';
import SearchBar from '../feature/Todo/SearchBar';
import TaskSelector from '../feature/Todo/TaskSelector';
import TaskList from '../feature/Todo/TaskList';
import ProgressBar from '../feature/Todo/ProgressBar';
import ChatBubble from '../component/ChatBuble';
import AddCategoryForm from '../feature/Todo/Form/AddCategoryForm';
import GiveUpDialog from '../feature/Dialog/GiveUpDialog';
import NotInProgressDialog from '../feature/Dialog/NotInProgressDialog';
import DeleteDialog from '../feature/Dialog/DeleteDialog';
import { taskService, categoryService } from '../api/apiService';
import { useTaskRefresh } from '../context/TaskRefreshContext';

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
  const [selectedStatus, setSelectedStatus] = useState(['pending', 'in-progress', 'completed', 'given-up']);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [categories, setCategories] = useState([]);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (isGiveUpModalOpen || isNotInProgressModalOpen || isDeleteModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isGiveUpModalOpen, isNotInProgressModalOpen, isDeleteModalOpen]);

  // Fetch tasks on component mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const response = await taskService.getAllTasks();
        console.log('API Response:', response);
        // API trả về array trực tiếp hoặc object với tasks property
        const tasksData = Array.isArray(response) ? response : response.tasks;
        // sort taskData theo dueDate
        tasksData.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
        if (tasksData) {
          setTasks(tasksData);
          console.log('Tasks loaded:', tasksData);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    };

    fetchTasks();
  }, [refreshTrigger]); // Listen to refreshTrigger

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getAllCategories();
        const categoriesData = Array.isArray(response) ? response : response.categories;
        if (categoriesData) {
          setCategories(categoriesData.map(cat => cat.name));
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

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
      await refreshTasks();
    } catch (error) {
      console.error('Failed to toggle task:', error);
      alert(error.response?.data?.message || 'Failed to update task. Please try again.');
    }
  };

  const handleStart = async (taskId) => {
    try {
      await taskService.startTask(taskId);
      await refreshTasks();
    } catch (error) {
      console.error('Failed to start task:', error);
      alert(error.response?.data?.message || 'Failed to start task. Please try again.');
    }
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleGiveUp = async (taskId) => {
    setTaskToGiveUp(taskId);
    setIsGiveUpModalOpen(true);
  };

  const confirmGiveUp = async () => {
    try {
      await taskService.giveUpTask(taskToGiveUp);
      await refreshTasks();
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
      setTasks(tasks.filter((task) => task._id !== taskToDelete && task.id !== taskToDelete));
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
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, selectedStatus]);

  const completedCount = useMemo(() => {
    return tasks.filter((task) => task.status === 'completed').length;
  }, [tasks]);

  const totalCount = useMemo(() => {
    return tasks.filter((task) => task.status === 'in-progress' || task.status === 'completed').length;
  }, [tasks]);

  const refreshTasks = async () => {
    try {
      const response = await taskService.getAllTasks();
      console.log('Refresh Response:', response);
      const tasksData = Array.isArray(response) ? response : response.tasks;
      if (tasksData) {
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
    }
  };

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
      onClose={() => setIsModalOpen(false)}
      onTaskCreated={refreshTasks}
    />

    <TaskDetailButton
      isOpen={isEditModalOpen}
      task={selectedTask}
      onClose={() => {
        setIsEditModalOpen(false);
        setSelectedTask(null);
      }}
      onTaskUpdated={refreshTasks}
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
        <div className="w-full max-w-4xl mx-auto bg-gray-100/50 backdrop-blur-sm rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="flex justify-center text-3xl font-bold mb-3 bg-gradient-to-r bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              My Todo App
            </h1> 
            <p className="flex justify-center text-gray-500 mb-2">Stay organized and productive</p>
            <div className="flex justify-center gap-2 text-sm text-gray-500">
              <span>{completedCount} completed</span>
              <span>·</span>
              <span>{totalCount} total tasks</span>
            </div>
          </div>

          <ActionButtons 
            onAddTask={() => setIsModalOpen(true)} 
            onAddCategory={() => setIsAddCategoryModalOpen(true)}
          />

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
            onToggleComplete={handleToggleComplete}
            onEdit={handleEdit}
            onStart={handleStart}
            onGiveUp={handleGiveUp}
            onDelete={handleDelete}
          />

          <div className="mt-6">
            <ProgressBar completed={completedCount} total={totalCount} />
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
                // Refresh categories list
                categoryService.getAllCategories().then(response => {
                  const categoriesData = Array.isArray(response) ? response : response.categories;
                  if (categoriesData) {
                    setCategories(categoriesData.map(cat => cat.name));
                  }
                });
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

