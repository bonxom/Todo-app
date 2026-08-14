import { useState, useEffect, useRef } from 'react';
import { CalendarClock, Check, CircleDot, FolderKanban, Loader2, Pencil, Tag, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react';
import { formatDateTime } from '@/shared/utils/dateTime';
import { setTaskDragData } from '@/shared/utils/taskDrag';
import { getTaskProjectColor } from '@/shared/utils/projectColor';

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
    className="inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-transform duration-150 hover:scale-[1.04]"
    style={style}
  >
    {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
    {children}
  </span>
);

// One-shot border/glow presets for the whole card: each task action gets its
// own color so the card itself visibly "announces" what just happened, not
// just the small button that was clicked.
const cardFlashPresets = {
  complete: { border: 'var(--color-success)', shadow: 'color-mix(in srgb, var(--color-success) 35%, transparent)' },
  giveUp: { border: 'var(--color-danger)', shadow: 'color-mix(in srgb, var(--color-danger) 35%, transparent)' },
  accept: { border: '#8b5cf6', shadow: 'rgba(139, 92, 246, 0.35)' },
  deny: { border: '#eab308', shadow: 'rgba(234, 179, 8, 0.35)' },
};

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
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-all duration-150 ease-out hover:scale-110 active:scale-90 focus-visible:outline-none focus-visible:ring-2 ${hoverStyles[tone]}`}
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
  onTaskStatusChange,
  onTaskDelete,
}) => {
  const [isCompletionUpdating, setIsCompletionUpdating] = useState(false);
  const [isGiveUpUpdating, setIsGiveUpUpdating] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  // Drives a short-lived "celebration" pop + ring pulse right after a task
  // flips to completed, so the action feels rewarding instead of silent.
  const [justCompleted, setJustCompleted] = useState(false);
  const celebrationTimeoutRef = useRef(null);
  // Drives the whole-card border/glow pulse ("chạy 1 vòng rồi trở lại bình
  // thường") for complete / give-up / accept / deny actions.
  const [flashColor, setFlashColor] = useState(null);
  const flashTimeoutRef = useRef(null);

  const triggerCardFlash = (key) => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashColor(key);
    flashTimeoutRef.current = setTimeout(() => setFlashColor(null), 700);
  };

  const projectName = task.projectId?.name || 'Standalone';
  const categoryName = task.categoryId?.name || 'Uncategorized';
  const taskId = task._id || task.id;
  const isPending = task.status === 'pending';
  const isCompleted = task.status === 'completed';
  const isGivenUp = task.status === 'given-up';
  const isGiveUpAvailable = task.status === 'in-progress' || isGivenUp || isPending;
  const isMutedStatus = isCompleted || isGivenUp;
  const priorityStyle = getPriorityStyle(task.priority);
  const statusStyle = getStatusStyle(task.status);
  const projectColor = task.projectId ? getTaskProjectColor(task) : null;
  const AcceptOrCompleteIcon = isPending ? ThumbsUp : Check;
  const DenyOrGiveUpIcon = isPending ? ThumbsDown : X;
  const cardStyle = {
    borderColor: task.isOverDue && !isMutedStatus ? 'var(--color-danger-soft)' : 'var(--color-line)',
    borderStyle: isPending ? 'dashed' : 'solid',
    borderLeftStyle: 'solid',
    background: isMutedStatus ? 'var(--color-surface-muted)' : 'var(--color-surface)',
    boxShadow: 'var(--shadow-xs)',
    borderLeftColor: projectColor || (task.isOverDue && !isMutedStatus ? 'var(--color-danger-soft)' : 'var(--color-line)'),
    borderLeftWidth: projectColor ? '5px' : undefined,
    ...(flashColor
      ? {
          borderColor: cardFlashPresets[flashColor].border,
          borderLeftColor: cardFlashPresets[flashColor].border,
          boxShadow: `0 0 0 3px ${cardFlashPresets[flashColor].shadow}, var(--shadow-xs)`,
        }
      : null),
  };

  useEffect(() => () => {
    if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
  }, []);

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

    if (isCompletionUpdating || isFlushing) {
      return;
    }

    try {
      setIsCompletionUpdating(true);
      if (isPending) {
        await onTaskStatusChange?.(task, 'in-progress');
        triggerCardFlash('accept');
      } else {
        const goingToComplete = !isCompleted;
        await onTaskStatusChange?.(task, isCompleted ? 'in-progress' : 'completed');
        if (goingToComplete) {
          setJustCompleted(true);
          celebrationTimeoutRef.current = setTimeout(() => setJustCompleted(false), 500);
          triggerCardFlash('complete');
        }
      }
    } catch (error) {
      console.error('Failed to update task completion:', error);
    } finally {
      setIsCompletionUpdating(false);
    }
  };

  const handleToggleGiveUp = async (event) => {
    event.stopPropagation();

    if (isPending) {
      const deleteHandler = onTaskDelete || onDelete;
      if (!deleteHandler || isGiveUpUpdating || isFlushing) return;

      try {
        setIsGiveUpUpdating(true);
        triggerCardFlash('deny');
        setIsFlushing(true);
        await new Promise((resolve) => setTimeout(resolve, 350));
        await deleteHandler(taskId);
      } catch (error) {
        console.error('Failed to deny/delete task:', error);
        setIsFlushing(false);
      } finally {
        setIsGiveUpUpdating(false);
      }
      return;
    }

    if (isGiveUpUpdating || !isGiveUpAvailable || isFlushing) {
      return;
    }

    try {
      setIsGiveUpUpdating(true);
      const goingToGiveUp = !isGivenUp;
      await onTaskStatusChange?.(task, isGivenUp ? 'in-progress' : 'given-up');
      if (goingToGiveUp) {
        triggerCardFlash('giveUp');
      }
    } catch (error) {
      console.error('Failed to update task give-up status:', error);
    } finally {
      setIsGiveUpUpdating(false);
    }
  };

  const details = (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3
            className={`min-w-0 break-words text-sm font-semibold transition-colors duration-300 ${
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
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

        {isPending ? (
          <div className="ml-auto flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={handleToggleCompletion}
              disabled={isCompletionUpdating || isFlushing}
              className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-dashed border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)] shadow-sm transition-all duration-150 ease-out hover:scale-105 hover:border-solid hover:border-[var(--color-success)] hover:bg-[var(--color-success-soft)] hover:text-[var(--color-success)] hover:shadow-md active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              aria-label={`Accept ${task.title}`}
            >
              {isCompletionUpdating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Accept</span>
            </button>
            <button
              type="button"
              onClick={handleToggleGiveUp}
              disabled={isGiveUpUpdating || isFlushing}
              className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-dashed border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)] shadow-sm transition-all duration-150 ease-out hover:scale-105 hover:border-solid hover:border-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] hover:shadow-md active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              aria-label={`Deny ${task.title}`}
            >
              {isGiveUpUpdating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{isFlushing ? 'Denying…' : 'Deny'}</span>
            </button>
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <article
      draggable={Boolean(taskId) && !isFlushing}
      onDragStart={handleDragStart}
      className={`group cursor-grab rounded-[16px] border p-4 active:cursor-grabbing transition-all duration-350 ease-in-out ${
        isMutedStatus ? 'opacity-85' : ''
      } ${
        isFlushing
          ? 'pointer-events-none opacity-0 scale-90 -translate-x-10 max-h-0 !p-0 !m-0 !border-transparent bg-[var(--color-danger-soft)]'
          : 'max-h-[500px] opacity-100 scale-100 translate-x-0 hover:shadow-md'
      }`}
      style={cardStyle}
    >
      <div className="flex items-start gap-3">
        {!isPending ? (
          <div className="mt-0.5 flex w-6 shrink-0 flex-col items-center gap-1.5">
            <div className="relative">
              {justCompleted ? (
                <span
                  className="pointer-events-none absolute inset-0 rounded-lg animate-ping"
                  style={{ background: 'var(--color-success)', opacity: 0.5 }}
                  aria-hidden="true"
                />
              ) : null}
              <button
                type="button"
                onClick={handleToggleCompletion}
                disabled={isCompletionUpdating}
                aria-pressed={isCompleted}
                aria-label={
                  isCompleted
                    ? `Mark ${task.title} as in progress`
                    : `Mark ${task.title} as completed`
                }
                title={
                  isCompleted
                    ? 'Mark as in progress'
                    : 'Mark as completed'
                }
                className={`ui-focus-ring relative inline-flex h-6 w-6 items-center justify-center rounded-lg border transition-all duration-200 ease-out hover:scale-110 active:scale-90 disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100 ${
                  justCompleted ? 'scale-125' : 'scale-100'
                } ${
                  isCompleted
                    ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white shadow-sm'
                    : 'border-[var(--color-line)] bg-[var(--color-surface)] text-transparent hover:border-[var(--color-success)] hover:bg-[var(--color-success-soft)] hover:text-[var(--color-success)] hover:shadow-sm'
                }`}
              >
                {isCompletionUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleToggleGiveUp}
              disabled={isGiveUpUpdating || !isGiveUpAvailable}
              aria-pressed={isGivenUp}
              aria-label={
                isGivenUp
                  ? `Restore ${task.title} to in progress`
                  : `Give up ${task.title}`
              }
              title={
                isGivenUp
                  ? 'Restore to in progress'
                  : 'Give up task'
              }
              className={`ui-focus-ring inline-flex h-6 w-6 items-center justify-center rounded-lg border transition-all duration-200 ease-out hover:scale-110 active:scale-90 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 ${
                isGivenUp
                  ? 'border-[var(--color-danger)] bg-[var(--color-danger)] text-white shadow-sm'
                  : 'border-[var(--color-danger-soft)] bg-[var(--color-surface)] text-[var(--color-danger)] hover:border-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] hover:shadow-sm'
              }`}
            >
              {isGiveUpUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          {mode === 'panel' ? (
            <button
              type="button"
              onClick={handleOpen}
              className="ui-focus-ring w-full rounded-[12px] px-1 py-0.5 text-left transition-[background-color] duration-150 hover:bg-[var(--color-surface-muted)] active:bg-[var(--color-surface-muted)]"
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