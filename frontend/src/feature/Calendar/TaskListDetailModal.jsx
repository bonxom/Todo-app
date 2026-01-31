import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import TaskCard from '../Category/TaskCard';
import TaskDetailForm from '../Todo/Form/TaskDetailForm';
import GiveUpDialog from '../Dialog/GiveUpDialog';
import DeleteDialog from '../Dialog/DeleteDialog';
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

      <GiveUpDialog
        isOpen={isGiveUpModalOpen}
        onClose={() => {
          setIsGiveUpModalOpen(false);
          setTaskToGiveUp(null);
        }}
        onConfirm={confirmGiveUp}
      />

      <DeleteDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={confirmDelete}
      />

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
