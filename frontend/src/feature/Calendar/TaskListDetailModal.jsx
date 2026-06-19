import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import TaskDetailButton from '../Todo/TaskDetailButton';
import DeleteDialog from '../Dialog/DeleteDialog';
import { taskService } from '../../api/apiService';
import CalendarTaskDetailCard from './CalendarTaskDetailCard';
import { formatDateTime } from '../../utils/dateTime';
import { sortTasksByDueTime } from './calendarUtils';

const TaskListDetailModal = ({ isOpen, onClose, selectedDate, tasks, onTaskUpdated, summaryOnly = false }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  const handleEdit = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
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

  const isToday = selectedDate && selectedDate.toDateString() === new Date().toDateString();
  const sortedTasks = sortTasksByDueTime(tasks);
  const completedTasks = sortedTasks.filter(task => task.status === 'completed').length;
  const totalTasks = tasks.length;

  const modalContent = (
    <>
      <TaskDetailButton
        isOpen={isEditModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onTaskUpdated={onTaskUpdated}
        onProjectCreated={onTaskUpdated}
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
        className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="animate-fadeIn flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[18px] border border-[var(--color-line)] bg-[var(--color-surface)]"
          style={{ boxShadow: 'var(--shadow-lg)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)] p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <CalendarIcon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-[var(--color-text)]">
                    {isToday ? "Today's Tasks" : 'Day Tasks'}
                  </h2>
                  {selectedDate && (
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {formatDateTime(selectedDate)}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="ui-icon-button ui-focus-ring"
                aria-label="Close task list"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <span className="ui-chip ui-tabular">{completedTasks}/{totalTasks} completed</span>
              <span className="ui-chip ui-tabular">{totalTasks} total tasks</span>
              <span className="ui-chip">In progress first</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain p-6">
            {sortedTasks.length > 0 ? (
              <div className="space-y-3">
                {sortedTasks.map((task) => (
                  <div
                    key={task._id || task.id}
                    className={`transition-[opacity,transform] duration-300 ${
                      deletingTaskId === (task._id || task.id)
                        ? 'pointer-events-none scale-95 opacity-0'
                        : 'scale-100 opacity-100'
                    }`}
                  >
                    <CalendarTaskDetailCard
                      task={task}
                      mode="modal"
                      summaryOnly={summaryOnly}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onTaskUpdated={onTaskUpdated}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-[var(--color-text-muted)]">
                <CalendarIcon className="mx-auto mb-3 h-16 w-16 opacity-50" aria-hidden="true" />
                <p className="text-lg font-medium text-[var(--color-text)]">No tasks for this day</p>
                <p className="mt-1 text-sm">
                  {isToday ? "You're all caught up." : 'Select another date to view tasks'}
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
