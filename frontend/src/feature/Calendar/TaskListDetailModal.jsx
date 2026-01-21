import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import TaskCard from '../Category/TaskCard';
import TaskDetailForm from '../Todo/Form/TaskDetailForm';
import { taskService } from '../../api/apiService';

const TaskListDetailModal = ({ isOpen, onClose, selectedDate, tasks, onTaskUpdated }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isGiveUpModalOpen, setIsGiveUpModalOpen] = useState(false);
  const [taskToGiveUp, setTaskToGiveUp] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  const handleEdit = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleGiveUp = (taskId) => {
    setTaskToGiveUp(taskId);
    setIsGiveUpModalOpen(true);
  };

  const confirmGiveUp = async () => {
    try {
      await taskService.giveUpTask(taskToGiveUp);
      if (onTaskUpdated) onTaskUpdated();
      setIsGiveUpModalOpen(false);
      setTaskToGiveUp(null);
    } catch (error) {
      console.error('Failed to give up task:', error);
      alert(error.response?.data?.message || 'Failed to give up task.');
    }
  };

  const handleDelete = (taskId) => {
    setTaskToDelete(taskId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setDeletingTaskId(taskToDelete);
      setIsDeleteModalOpen(false);
      
      await taskService.deleteTask(taskToDelete);
      
      // Wait for animation to complete, then refresh
      setTimeout(() => {
        setDeletingTaskId(null);
        setTaskToDelete(null);
        if (onTaskUpdated) onTaskUpdated();
      }, 300);
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task.');
      setDeletingTaskId(null);
      setTaskToDelete(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (date) => {
    if (!date) return '';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const isToday = selectedDate && selectedDate.toDateString() === new Date().toDateString();
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const totalTasks = tasks.length;

  const modalContent = (
    <>
      {isEditModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm bg-black/30"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => {
            setIsEditModalOpen(false);
            setSelectedTask(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl relative animate-fadeIn" 
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white rounded-t-2xl p-6 pb-4 border-b border-gray-100 z-10">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedTask(null);
                }}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold text-gray-900 pr-10">Edit Task</h2>
            </div>

            <div className="px-6 py-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              <TaskDetailForm task={selectedTask} onClose={() => {
                setIsEditModalOpen(false);
                setSelectedTask(null);
              }} onTaskUpdated={onTaskUpdated} />
            </div>
          </div>
        </div>
      )}

      {isGiveUpModalOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
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

      {isDeleteModalOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
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

      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-fadeIn flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 border-b border-gray-200 p-6 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-7 h-7 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-800">
                  {isToday ? "Today's Tasks" : 'Tasks'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-gray-800 transition-colors p-1 hover:bg-white/50 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {selectedDate && (
              <p className="text-sm text-gray-600 mb-2">
                {formatDate(selectedDate)}
              </p>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
              <span>{completedTasks}/{totalTasks} completed</span>
              <span>•</span>
              <span>{totalTasks} total tasks</span>
            </div>
          </div>

          {/* Tasks List */}
          <div className="p-6 overflow-y-auto flex-1">
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task._id || task.id}
                    className={`transition-all duration-300 ${
                      deletingTaskId === (task._id || task.id)
                        ? 'opacity-0 scale-95 pointer-events-none'
                        : 'opacity-100 scale-100'
                    }`}
                  >
                    <TaskCard 
                      task={task}
                      showActions={true}
                      onEdit={handleEdit}
                      onGiveUp={handleGiveUp}
                      onDelete={handleDelete}
                      onTaskUpdated={onTaskUpdated}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <CalendarIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No tasks for this day</p>
                <p className="text-sm mt-1">
                  {isToday ? "You're all caught up!" : 'Select another date to view tasks'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default TaskListDetailModal;
