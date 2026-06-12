import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Folder, Pencil, Trash2, X } from 'lucide-react';
import TaskCard from '../Category/TaskCard';
import TaskDetailButton from '../Todo/TaskDetailButton';
import ProgressBar from '../Todo/ProgressBar';
import GiveUpDialog from '../Dialog/GiveUpDialog';
import DeleteDialog from '../Dialog/DeleteDialog';
import { taskService } from '../../api/apiService';

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
      alert(error.response?.data?.message || 'Failed to delete task.');
      setDeletingTaskId(null);
      setTaskToDelete(null);
    }
  };

  const modalContent = (
    <>
      {isEditTaskOpen && (
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={onClose}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-shrink-0 border-b border-sky-100 bg-gradient-to-r from-sky-100 via-cyan-50 to-white px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-sky-700 shadow-sm">
                    <Folder className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-600">Project</p>
                    <h2 className="truncate text-2xl font-semibold text-gray-900">{project.name}</h2>
                  </div>
                </div>
                <p className="mt-3 max-w-2xl text-sm text-gray-600">
                  {project.description || 'No project description yet. Add context so this workstream is easier to scan later.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onProjectEdit}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-4 text-sm font-medium text-sky-700 transition-all hover:border-sky-300 hover:bg-sky-50"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  type="button"
                  onClick={onProjectDelete}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition-all hover:border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-white/80 hover:text-gray-800"
                  aria-label="Close project details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Completed</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">{completedTasks}</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Pending</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">{pendingTasks}</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Total</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">{totalTasks}</p>
                </div>
              </div>

              <ProgressBar
                compact
                title={`${project.name} progress`}
                completed={completedTasks}
                total={totalTasks}
                accentClassName="from-sky-500 to-cyan-600"
                emptyLabel="No tasks in this project yet"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task._id || task.id}
                    className={`transition-all duration-300 ${
                      deletingTaskId === (task._id || task.id)
                        ? 'pointer-events-none scale-95 opacity-0'
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
              <div className="rounded-[2rem] border border-dashed border-sky-200 bg-sky-50/70 px-6 py-14 text-center">
                <Folder className="mx-auto h-14 w-14 text-sky-300" />
                <p className="mt-4 text-lg font-semibold text-gray-900">No tasks in this project</p>
                <p className="mt-2 text-sm text-gray-500">
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
