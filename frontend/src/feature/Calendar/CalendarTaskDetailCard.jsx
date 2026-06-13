import { useState } from 'react';
import { CalendarClock, Check, CircleDot, FolderKanban, Pencil, Tag, Trash2, XCircle } from 'lucide-react';
import { formatDateTime } from '../../utils/dateTime';
import { toggleTaskCompletion } from '../../utils/taskCompletion';

const formatLabel = (value) => {
  if (!value) return 'None';

  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const priorityClassNames = {
  High: 'border-red-200 bg-red-50 text-red-700',
  Medium: 'border-amber-200 bg-amber-50 text-amber-700',
  Low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const statusClassNames = {
  pending: 'border-purple-200 bg-purple-50 text-purple-700',
  'in-progress': 'border-blue-200 bg-blue-50 text-blue-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'given-up': 'border-slate-200 bg-slate-100 text-slate-600',
};

const Badge = ({ icon: Icon, children, className = '' }) => (
  <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
    {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
    {children}
  </span>
);

const CalendarTaskDetailCard = ({
  task,
  mode = 'panel',
  onClick,
  onEdit,
  onGiveUp,
  onDelete,
  onTaskUpdated,
}) => {
  const [isCompletionUpdating, setIsCompletionUpdating] = useState(false);
  const projectName = task.projectId?.name || 'Standalone';
  const categoryName = task.categoryId?.name || 'Uncategorized';
  const taskId = task._id || task.id;
  const isCompleted = task.status === 'completed';

  const handleDragStart = (event) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('taskId', taskId);
    event.dataTransfer.setData('currentCategoryId', task.categoryId?._id || task.categoryId || '');
  };

  const handleCardClick = () => {
    if (mode === 'panel') {
      onClick?.(task);
    }
  };

  const handleToggleCompletion = async (event) => {
    event.stopPropagation();

    if (isCompletionUpdating) {
      return;
    }

    try {
      setIsCompletionUpdating(true);
      await toggleTaskCompletion(task);
      onTaskUpdated?.();
    } catch (error) {
      console.error('Failed to update task completion:', error);
      alert(error.response?.data?.message || 'Failed to update task completion.');
    } finally {
      setIsCompletionUpdating(false);
    }
  };

  const badges = (
    <div className="flex min-w-0 flex-wrap gap-2 md:justify-end">
      <Badge className={priorityClassNames[task.priority] || 'border-slate-200 bg-slate-50 text-slate-700'}>
        {task.priority || 'Medium'}
      </Badge>
      <Badge icon={CalendarClock} className="border-indigo-200 bg-indigo-50 text-indigo-700">
        {formatDateTime(task.dueDate, 'No due date')}
      </Badge>
      <Badge icon={CircleDot} className={statusClassNames[task.status] || 'border-slate-200 bg-slate-50 text-slate-700'}>
        {formatLabel(task.status)}
      </Badge>
      <Badge icon={FolderKanban} className="border-sky-200 bg-sky-50 text-sky-700">
        {projectName}
      </Badge>
      <Badge icon={Tag} className="border-slate-200 bg-slate-50 text-slate-600">
        {categoryName}
      </Badge>
    </div>
  );

  return (
    <article
      draggable={Boolean(taskId)}
      onDragStart={handleDragStart}
      onClick={handleCardClick}
      className={`rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm transition-all ${
        mode === 'panel'
          ? 'cursor-pointer hover:border-sky-200 hover:bg-sky-50/40 hover:shadow-md focus-within:ring-4 focus-within:ring-sky-100'
          : ''
      } ${isCompleted ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleToggleCompletion}
          disabled={isCompletionUpdating}
          aria-pressed={isCompleted}
          aria-label={isCompleted ? `Mark ${task.title} as in progress` : `Mark ${task.title} as completed`}
          className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-wait disabled:opacity-70 ${
            isCompleted
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 bg-white text-transparent hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-500'
          }`}
        >
          <Check className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <h3 className={`min-w-0 truncate text-sm font-semibold md:max-w-[45%] ${
              isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
            }`}>
              {task.title}
            </h3>
            {badges}
          </div>

          {task.description ? (
            <p className="mt-1 max-h-10 overflow-hidden text-xs text-slate-500">{task.description}</p>
          ) : null}
        </div>

        {mode === 'modal' ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.(task);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
              aria-label={`Edit ${task.title}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            {task.status === 'in-progress' ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onGiveUp?.(taskId);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-orange-50 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-200"
                aria-label={`Give up ${task.title}`}
              >
                <XCircle className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(taskId);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
              aria-label={`Delete ${task.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {mode === 'panel' ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClick?.(task);
          }}
          className="sr-only"
        >
          Edit {task.title}
        </button>
      ) : null}
    </article>
  );
};

export default CalendarTaskDetailCard;
