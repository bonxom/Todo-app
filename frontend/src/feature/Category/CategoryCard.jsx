import { useState } from 'react';
import { ChevronRight, Folder, Trash2 } from 'lucide-react';
import TaskCard from './TaskCard';
import CategoryDetailModal from './CategoryDetailModal';
import TaskDetailButton from '../Todo/TaskDetailButton';
import DeleteCategoryDialog from '../Dialog/DeleteCategoryDialog';
import { categoryService, taskService } from '../../api/apiService';
import { getTaskDragData } from '../../utils/taskDrag';

const CategoryCard = ({ category, description, tasks, onTaskUpdated, categoryId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const displayTasks = tasks.slice(0, 3);
  const hasMore = tasks.length > 3;
  const descriptionId = `category-${categoryId}-description`;

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await categoryService.deleteCategory(categoryId);
      setIsDeleteDialogOpen(false);
      onTaskUpdated?.();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert(error.response?.data?.message || 'Failed to delete category. Please try again.');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDragOver(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const { taskId, currentCategoryId } = getTaskDragData(event);

    if (!taskId || currentCategoryId === categoryId) {
      return;
    }

    try {
      await taskService.updateTask(taskId, { categoryId });
      onTaskUpdated?.();
    } catch (error) {
      console.error('Failed to move task:', error);
      alert(error.response?.data?.message || 'Failed to move task to this category.');
    }
  };

  return (
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

      <CategoryDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={category}
        description={description}
        tasks={tasks}
        onTaskUpdated={onTaskUpdated}
      />

      <article
        className={`ui-drop-zone ui-section-card flex h-full flex-col overflow-hidden transition-[border-color,box-shadow,background-color,transform] duration-200 ${
          isDragOver
            ? 'border-[color:var(--color-accent)] bg-[var(--color-accent-soft)]'
            : 'hover:border-[color:var(--color-accent)]'
        }`}
        data-drag-active={isDragOver ? 'true' : 'false'}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="ui-focus-ring min-w-0 flex-1 rounded-[10px] text-left"
              aria-describedby={descriptionId}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--color-line)] bg-[var(--color-surface-muted)] text-[color:var(--color-accent)]">
                  <Folder className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-muted)]">
                    Category
                  </p>
                  <h3 className="truncate text-lg font-semibold text-[color:var(--color-text)]">{category}</h3>
                </div>
              </div>
            </button>

            {category !== 'Uncategorized' ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[var(--color-surface)] text-[color:var(--color-danger)] transition-[background-color,border-color,color] duration-150 hover:border-[color:var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                aria-label={`Delete ${category}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <p
            id={descriptionId}
            className="mt-4 min-h-[3rem] break-words text-sm leading-6 text-[color:var(--color-text-muted)]"
          >
            {description || 'No category description yet.'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="ui-chip ui-tabular">{totalTasks} tasks</span>
            <span className="ui-chip ui-chip--success ui-tabular">{completedTasks} completed</span>
            <span className="ui-chip ui-tabular">{completionRate}% complete</span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-[color:var(--color-text-muted)]">
              <span>Progress</span>
              <span className="ui-tabular">{completedTasks}/{totalTasks}</span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
              role="progressbar"
              aria-label={`${category} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionRate}
            >
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-200"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col border-t border-[color:var(--color-line)] px-5 pb-5 pt-4">
          {displayTasks.length > 0 ? (
            <div className="space-y-2.5">
              {displayTasks.map((task) => (
                <TaskCard
                  key={task._id || task.id}
                  task={task}
                  onClick={handleTaskClick}
                  quickActions
                  enableDrag
                  onTaskUpdated={onTaskUpdated}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[12px] border border-dashed border-[color:var(--color-line)] bg-[var(--color-surface-muted)] px-4 py-8 text-center">
              <p className="text-sm font-medium text-[color:var(--color-text)]">No tasks in this category</p>
              <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                Drag a task here or assign one from a task form.
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-[color:var(--color-text-muted)]">
              {hasMore ? `${tasks.length - 3} more tasks available` : 'Recent tasks shown above'}
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="ui-btn-tertiary shrink-0 px-0"
            >
              <span>{hasMore ? 'View All Tasks' : 'Open Details'}</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>

      <DeleteCategoryDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        categoryName={category}
      />
    </>
  );
};

export default CategoryCard;
