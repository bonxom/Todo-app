import { useState, useEffect } from 'react';
import MainLayout from '../layout/MainLayout';
import ActionButtons from '../feature/Todo/GenTaskButton';
import AddTaskButton from '../feature/Todo/AddTaskButton';
import TaskDetailButton from '../feature/Todo/TaskDetailButton';
import SearchBar from '../feature/Todo/SearchBar';
import FilterBar from '../feature/Todo/FilterBar';
import TaskList from '../feature/Todo/TaskList';
import ProgressBar from '../feature/Todo/ProgressBar';
import ChatBubble from '../component/ChatBuble';
import { taskService, categoryService } from '../api/apiService';

const TodoPage = () => {
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
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Fetch tasks on component mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const response = await taskService.getAllTasks();
        console.log('API Response:', response);
        // API trả về array trực tiếp hoặc object với tasks property
        const tasksData = Array.isArray(response) ? response : response.tasks;
        if (tasksData) {
          setTasks(tasksData);
          console.log('Tasks loaded:', tasksData);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

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

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const totalCount = tasks.length;

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

  return (
    <>
    <MainLayout>
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

      {/* Give Up Confirmation Modal */}
      {isGiveUpModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Give Up Task</h2>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium mb-1">Are you sure you want to give up this task?</p>
                  <p className="text-sm text-gray-500">You are choosing not to continue working on this task.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsGiveUpModalOpen(false);
                    setTaskToGiveUp(null);
                  }}
                  className="flex-1 h-11 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmGiveUp}
                  className="flex-1 h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-xl shadow-md transition-all"
                >
                  Give Up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Not In Progress Warning Modal */}
      {isNotInProgressModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Task Not In Progress</h2>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium mb-1">You are not working on this task</p>
                  <p className="text-sm text-gray-500">This task must be in progress before you can mark it as completed.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsNotInProgressModalOpen(false)}
                  className="px-6 h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-md transition-all"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Delete Task</h2>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium mb-1">Are you sure you want to delete this task?</p>
                  <p className="text-sm text-gray-500">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setTaskToDelete(null);
                  }}
                  className="flex-1 h-11 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 h-11 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl shadow-md transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
            onAutoGenerate={() => console.log('Generate tasks')}
          />

          <div className="flex flex-col sm:flex-row gap-4 my-6">
            <div className="flex-1">
              <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            </div>
            <div className="sm:w-auto">
              <FilterBar
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
              />
            </div>
          </div>

          <TaskList
            tasks={filteredTasks}
            onToggleComplete={handleToggleComplete}
            onEdit={handleEdit}
            onGiveUp={handleGiveUp}
            onDelete={handleDelete}
          />

          <div className="mt-6">
            <ProgressBar completed={completedCount} total={totalCount} />
          </div>
        </div>
      </div>
    </MainLayout>
    
    <ChatBubble />
  </>
  );
};

export default TodoPage;

