import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Folder, X } from 'lucide-react';
import TaskCard from './TaskCard';
import TaskDetailButton from '../Todo/TaskDetailButton';
import GiveUpDialog from '../Dialog/GiveUpDialog';
import DeleteDialog from '../Dialog/DeleteDialog';
import { taskService } from '../../api/apiService';

const CategoryDetailModal = ({ isOpen, onClose, category, description, tasks, onTaskUpdated }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isGiveUpModalOpen, setIsGiveUpModalOpen] = useState(false);
  const [taskToGiveUp, setTaskToGiveUp] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

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

  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
      onTaskUpdated?.();
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

      setTimeout(() => {
        setDeletingTaskId(null);
        setTaskToDelete(null);
        onTaskUpdated?.();
      }, 300);
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task.');
      setDeletingTaskId(null);
      setTaskToDelete(null);
    }
  };

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
        className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[20px] border border-[color:var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] animate-fadeIn overscroll-contain"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-detail-title"
        >
          <div className="border-b border-[color:var(--color-line)] px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--color-line)] bg-[var(--color-surface-muted)] text-[color:var(--color-accent)]">
                    <Folder className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="ui-page-kicker">Category</p>
                    <h2 id="category-detail-title" className="truncate text-2xl font-semibold text-[color:var(--color-text)]">
                      {category}
                    </h2>
                  </div>
                </div>
                <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-[color:var(--color-text-muted)]">
                  {description || 'Tasks grouped under this category appear here.'}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-[color:var(--color-text-muted)] transition-[background-color,color,border-color] duration-150 hover:border-[color:var(--color-line)] hover:bg-[var(--color-surface-muted)] hover:text-[color:var(--color-text)]"
                aria-label="Close category details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="ui-chip ui-tabular">{totalTasks} tasks</span>
              <span className="ui-chip ui-chip--success ui-tabular">{completedTasks} completed</span>
              <span className="ui-chip ui-tabular">{progress}% complete</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task._id || task.id}
                    className={`transition-[opacity,transform] duration-300 ${
                      deletingTaskId === (task._id || task.id)
                        ? 'pointer-events-none scale-[0.98] opacity-0'
                        : 'scale-100 opacity-100'
                    }`}
                  >
                    <TaskCard
                      task={task}
                      showActions
                      onEdit={handleEdit}
                      onGiveUp={handleGiveUp}
                      onDelete={handleDelete}
                      onTaskUpdated={onTaskUpdated}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[14px] border border-dashed border-[color:var(--color-line)] bg-[var(--color-surface-muted)] px-6 py-14 text-center">
                <Folder className="mx-auto h-12 w-12 text-[color:var(--color-text-muted)]" aria-hidden="true" />
                <p className="mt-4 text-lg font-semibold text-[color:var(--color-text)]">No tasks in this category</p>
                <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
                  Create a task or move one into this category to start tracking it here.
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

export default CategoryDetailModal;
