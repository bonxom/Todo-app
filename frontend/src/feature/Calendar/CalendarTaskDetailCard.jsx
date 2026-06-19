import { useState } from 'react';
import { CalendarClock, Check, CircleDot, FolderKanban, Pencil, Tag, Trash2, X } from 'lucide-react';
import { formatDateTime } from '../../utils/dateTime';
import { toggleTaskCompletion, toggleTaskGiveUp } from '../../utils/taskCompletion';
import { setTaskDragData } from '../../utils/taskDrag';
import { getTaskProjectColor } from '../../utils/projectColor';

const formatLabel = (value) => {
  if (!value) return 'None';

  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const chipStyles = {
  neutral: {
    borderColor: 'var(--color-line)',
    background: 'var(--color-surface-muted)',
    color: 'var(--color-text-muted)',
  },
  accent: {
    borderColor: 'transparent',
    background: 'var(--color-accent-soft)',
    color: 'var(--color-accent)',
  },
  success: {
    borderColor: 'transparent',
    background: 'var(--color-success-soft)',
    color: 'var(--color-success)',
  },
  warning: {
    borderColor: 'transparent',
    background: 'var(--color-warning-soft)',
    color: 'var(--color-warning)',
  },
  danger: {
    borderColor: 'transparent',
    background: 'var(--color-danger-soft)',
    color: 'var(--color-danger)',
  },
};

const getPriorityStyle = (priority) => {
  if (priority === 'High') return chipStyles.danger;
  if (priority === 'Medium') return chipStyles.warning;
  if (priority === 'Low') return chipStyles.success;
  return chipStyles.neutral;
};

const getStatusStyle = (status) => {
  if (status === 'completed') return chipStyles.success;
  if (status === 'in-progress') return chipStyles.accent;
  if (status === 'pending') return chipStyles.warning;
  if (status === 'given-up') return chipStyles.danger;
  return chipStyles.neutral;
};

const Badge = ({ icon: Icon, children, style }) => (
  <span
    className="inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
    style={style}
  >
    {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
    {children}
  </span>
);

const IconAction = ({ label, onClick, tone = 'neutral', children }) => {
  const hoverStyles = {
    neutral: 'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:ring-[var(--ring-focus-outline)]',
    accent: 'hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] focus-visible:ring-[var(--ring-focus-outline)]',
    warning: 'hover:bg-[var(--color-warning-soft)] hover:text-[var(--color-warning)] focus-visible:ring-[var(--ring-focus-outline)]',
    danger: 'hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] focus-visible:ring-[var(--ring-focus-outline)]',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-[background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 ${hoverStyles[tone]}`}
      aria-label={label}
    >
      {children}
    </button>
  );
};

const CalendarTaskDetailCard = ({
  task,
  mode = 'panel',
  onClick,
  onEdit,
  onDelete,
  onTaskUpdated,
}) => {
  const [isCompletionUpdating, setIsCompletionUpdating] = useState(false);
  const [isGiveUpUpdating, setIsGiveUpUpdating] = useState(false);
  const projectName = task.projectId?.name || 'Standalone';
  const categoryName = task.categoryId?.name || 'Uncategorized';
  const taskId = task._id || task.id;
  const isCompleted = task.status === 'completed';
  const isGivenUp = task.status === 'given-up';
  const isGiveUpAvailable = task.status === 'in-progress' || isGivenUp;
  const isMutedStatus = isCompleted || isGivenUp;
  const priorityStyle = getPriorityStyle(task.priority);
  const statusStyle = getStatusStyle(task.status);
  const projectColor = task.projectId ? getTaskProjectColor(task) : null;
  const cardStyle = {
    borderColor: task.isOverDue && !isMutedStatus ? 'var(--color-danger-soft)' : 'var(--color-line)',
    background: isMutedStatus ? 'var(--color-surface-muted)' : 'var(--color-surface)',
    boxShadow: 'var(--shadow-xs)',
    borderLeftColor: projectColor || (task.isOverDue && !isMutedStatus ? 'var(--color-danger-soft)' : 'var(--color-line)'),
    borderLeftWidth: projectColor ? '5px' : undefined,
  };

  const handleDragStart = (event) => {
    event.stopPropagation();
    setTaskDragData(event, task);
  };

  const handleOpen = () => {
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

  const handleToggleGiveUp = async (event) => {
    event.stopPropagation();

    if (isGiveUpUpdating || !isGiveUpAvailable) {
      return;
    }

    try {
      setIsGiveUpUpdating(true);
      await toggleTaskGiveUp(task);
      onTaskUpdated?.();
    } catch (error) {
      console.error('Failed to update task give-up status:', error);
      alert(error.response?.data?.message || 'Failed to update task give-up status.');
    } finally {
      setIsGiveUpUpdating(false);
    }
  };

  const details = (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3
            className={`min-w-0 break-words text-sm font-semibold ${
              isMutedStatus ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text)]'
            }`}
          >
            {task.title}
          </h3>
          {task.description ? (
            <p className="mt-1 text-xs text-[var(--color-text-muted)] break-words">
              {task.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Badge style={priorityStyle}>{task.priority || 'Medium'}</Badge>
          <Badge icon={CircleDot} style={statusStyle}>{formatLabel(task.status)}</Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge icon={CalendarClock} style={chipStyles.neutral}>
          {formatDateTime(task.dueDate, 'No due date')}
        </Badge>
        <Badge icon={FolderKanban} style={chipStyles.accent}>
          {projectName}
        </Badge>
        <Badge icon={Tag} style={chipStyles.neutral}>
          {categoryName}
        </Badge>
      </div>
    </>
  );

  return (
    <article
      draggable={Boolean(taskId)}
      onDragStart={handleDragStart}
      className={`cursor-grab rounded-[16px] border p-4 active:cursor-grabbing ${isMutedStatus ? 'opacity-85' : ''}`}
      style={cardStyle}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex w-6 shrink-0 flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleCompletion}
            disabled={isCompletionUpdating}
            aria-pressed={isCompleted}
            aria-label={isCompleted ? `Mark ${task.title} as in progress` : `Mark ${task.title} as completed`}
            className={`ui-focus-ring inline-flex h-6 w-6 items-center justify-center rounded-lg border transition-[background-color,border-color,color] duration-150 disabled:cursor-wait disabled:opacity-70 ${
              isCompleted
                ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-transparent hover:border-[var(--color-success)] hover:bg-[var(--color-success-soft)] hover:text-[var(--color-success)]'
            }`}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleToggleGiveUp}
            disabled={isGiveUpUpdating || !isGiveUpAvailable}
            aria-pressed={isGivenUp}
            aria-label={isGivenUp ? `Restore ${task.title} to in progress` : `Give up ${task.title}`}
            className={`ui-focus-ring inline-flex h-6 w-6 items-center justify-center rounded-lg border transition-[background-color,border-color,color] duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${
              isGivenUp
                ? 'border-[var(--color-danger)] bg-[var(--color-danger)] text-white'
                : 'border-[var(--color-danger-soft)] bg-[var(--color-surface)] text-[var(--color-danger)] hover:border-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]'
            }`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {mode === 'panel' ? (
            <button
              type="button"
              onClick={handleOpen}
              className="ui-focus-ring w-full rounded-[12px] px-1 py-0.5 text-left transition-[background-color] duration-150 hover:bg-[var(--color-surface-muted)]"
              aria-label={`Open ${task.title}`}
            >
              {details}
            </button>
          ) : (
            <div className="px-1 py-0.5">{details}</div>
          )}
        </div>

        {mode === 'modal' ? (
          <div className="flex shrink-0 items-center gap-1">
            <IconAction
              label={`Edit ${task.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.(task);
              }}
              tone="accent"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </IconAction>
            <IconAction
              label={`Delete ${task.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(taskId);
              }}
              tone="danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </IconAction>
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default CalendarTaskDetailCard;
