import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen, Pencil, Trash2, X } from 'lucide-react';
import TaskCard from '../category/TaskCard';
import TaskDetailButton from '../TaskDetailButton';
import GiveUpDialog from '../dialogs/GiveUpDialog';
import DeleteDialog from '../dialogs/DeleteDialog';
import { useDeleteTaskMutation, useGiveUpTaskMutation } from '../../api/taskMutations';
import { getApiErrorMessage } from '@/shared/services/apiError';

const ProjectDetailModal = ({
  isOpen,
  onClose,
  project,
  tasks,
  onTaskUpdated,
  onProjectEdit,
  onProjectDelete,
}) => {
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isGiveUpModalOpen, setIsGiveUpModalOpen] = useState(false);
  const [taskToGiveUp, setTaskToGiveUp] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  const giveUpTaskMutation = useGiveUpTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();

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

  if (!isOpen || !project) return null;

  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((task) => task.status === 'pending').length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setIsEditTaskOpen(true);
  };

  const handleGiveUp = (taskId) => {
    setTaskToGiveUp(taskId);
    setIsGiveUpModalOpen(true);
  };

  const confirmGiveUp = async () => {
    try {
      await giveUpTaskMutation.mutateAsync(taskToGiveUp);
      onTaskUpdated?.();
      setIsGiveUpModalOpen(false);
      setTaskToGiveUp(null);
    } catch (error) {
      console.error('Failed to give up task:', error);
      alert(getApiErrorMessage(error, 'Failed to give up task.'));
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
      await deleteTaskMutation.mutateAsync(taskToDelete);

      setTimeout(() => {
        setDeletingTaskId(null);
        setTaskToDelete(null);
        onTaskUpdated?.();
      }, 300);
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert(getApiErrorMessage(error, 'Failed to delete task.'));
      setDeletingTaskId(null);
      setTaskToDelete(null);
    }
  };

  const modalContent = (
    <>
      <TaskDetailButton
        isOpen={isEditTaskOpen}
        task={selectedTask}
        onClose={() => {
          setIsEditTaskOpen(false);
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
          aria-labelledby="project-detail-title"
        >
          <div className="border-b border-[color:var(--color-line)] px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--color-line)] bg-[var(--color-surface-muted)] text-[color:var(--color-accent)]">
                    <FolderOpen className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="ui-page-kicker">Project</p>
                    <h2 id="project-detail-title" className="truncate text-2xl font-semibold text-[color:var(--color-text)]">
                      {project.name}
                    </h2>
                  </div>
                </div>
                <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-[color:var(--color-text-muted)]">
                  {project.description || 'No project description yet. Add context so this workstream is easier to scan later.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onProjectEdit}
                  className="ui-btn-secondary"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  type="button"
                  onClick={onProjectDelete}
                  className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-[10px] border border-[color:var(--color-danger)] px-4 text-sm font-semibold text-[color:var(--color-danger)] transition-[background-color,border-color,color] duration-150 hover:bg-[var(--color-danger-soft)]"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-[color:var(--color-text-muted)] transition-[background-color,color,border-color] duration-150 hover:border-[color:var(--color-line)] hover:bg-[var(--color-surface-muted)] hover:text-[color:var(--color-text)]"
                  aria-label="Close project details"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="ui-chip ui-tabular">{totalTasks} tasks</span>
              <span className="ui-chip ui-chip--success ui-tabular">{completedTasks} completed</span>
              <span className="ui-chip ui-tabular">{pendingTasks} pending</span>
              <span className="ui-chip ui-tabular">{progress}% complete</span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-[color:var(--color-text-muted)]">
                <span>Progress</span>
                <span className="ui-tabular">{completedTasks}/{totalTasks}</span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
                role="progressbar"
                aria-label={`${project.name} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
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
                      onEdit={handleEditTask}
                      onGiveUp={handleGiveUp}
                      onDelete={handleDelete}
                      onTaskUpdated={onTaskUpdated}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[14px] border border-dashed border-[color:var(--color-line)] bg-[var(--color-surface-muted)] px-6 py-14 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-[color:var(--color-text-muted)]" aria-hidden="true" />
                <p className="mt-4 text-lg font-semibold text-[color:var(--color-text)]">No tasks in this project</p>
                <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
                  Assign tasks from the Todo page or from task edit forms to start tracking project progress here.
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

export default ProjectDetailModal;
