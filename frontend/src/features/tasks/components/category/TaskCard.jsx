import { useState } from 'react';
import {
  AlarmClock,
  CircleCheckBig,
  Flag,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import { useFinishTaskMutation, useStartTaskMutation } from '../../api/taskMutations';
import { setTaskDragData } from '@/shared/utils/taskDrag';
import { getApiErrorMessage } from '@/shared/services/apiError';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const STATUS_META = {
  pending: {
    label: 'Pending',
    tone: 'text-[color:var(--color-text-muted)]',
    accent: 'var(--color-accent)',
  },
  'in-progress': {
    label: 'In Progress',
    tone: 'text-[color:var(--color-accent)]',
    accent: 'var(--color-accent)',
  },
  completed: {
    label: 'Completed',
    tone: 'text-[color:var(--color-success)]',
    accent: 'var(--color-success)',
  },
  'given-up': {
    label: 'Given Up',
    tone: 'text-[color:var(--color-text-muted)]',
    accent: 'var(--color-text-muted)',
  },
};

const PRIORITY_META = {
  High: 'ui-badge ui-badge--danger',
  Medium: 'ui-badge ui-badge--warning',
  Low: 'ui-badge',
};

const getDaysLeft = (deadline) => {
  if (!deadline) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getDeadlineMeta = (deadline) => {
  if (!deadline) return null;

  const daysLeft = getDaysLeft(deadline);
  const formattedDate = DATE_FORMATTER.format(new Date(deadline));

  if (daysLeft < 0) {
    return {
      label: `Overdue · ${formattedDate}`,
      badgeClassName: 'ui-badge ui-badge--danger',
      accent: 'var(--color-danger)',
    };
  }

  if (daysLeft === 0) {
    return {
      label: `Due Today · ${formattedDate}`,
      badgeClassName: 'ui-badge ui-badge--warning',
      accent: 'var(--color-warning)',
    };
  }

  if (daysLeft === 1) {
    return {
      label: `Due Tomorrow · ${formattedDate}`,
      badgeClassName: 'ui-badge ui-badge--warning',
      accent: 'var(--color-warning)',
    };
  }

  return {
    label: `Due ${formattedDate}`,
    badgeClassName: 'ui-badge',
    accent: null,
  };
};

const TaskCard = ({
  task,
  onClick,
  showActions,
  quickActions,
  onEdit,
  onGiveUp,
  onDelete,
  onTaskUpdated,
  enableDrag = false,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isCardHovering, setIsCardHovering] = useState(false);

  const statusMeta = STATUS_META[task.status] || STATUS_META.pending;
  const deadlineMeta = getDeadlineMeta(task.dueDate);
  const priorityClassName = PRIORITY_META[task.priority] || 'ui-badge';
  const accentColor = deadlineMeta?.accent || statusMeta.accent;
  const isCompleted = task.status === 'completed';
  const isGivenUp = task.status === 'given-up';
  const isPending = task.status === 'pending';
  const isSimpleInteractive = Boolean(onClick) && !showActions && !quickActions;

  const finishTaskMutation = useFinishTaskMutation();
  const startTaskMutation = useStartTaskMutation();

  const handleFinishTask = async (event) => {
    event.stopPropagation();
    if (isFinishing) return;

    try {
      setIsFinishing(true);
      await finishTaskMutation.mutateAsync(task._id || task.id);

      setTimeout(() => {
        onTaskUpdated?.();
        setIsFinishing(false);
      }, 500);
    } catch (error) {
      console.error('Failed to finish task:', error);
      alert(getApiErrorMessage(error, 'Failed to finish task.'));
      setIsFinishing(false);
    }
  };

  const handleStartTask = async (event) => {
    event.stopPropagation();

    try {
      await startTaskMutation.mutateAsync(task._id || task.id);
      onTaskUpdated?.();
    } catch (error) {
      console.error('Failed to start task:', error);
      alert(getApiErrorMessage(error, 'Failed to start task.'));
    }
  };

  const handleDragStart = (event) => {
    if (!enableDrag) return;

    event.stopPropagation();
    setTaskDragData(event, task);
  };

  const handleKeyDown = (event) => {
    if (!onClick || showActions) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(task);
    }
  };

  const Wrapper = isSimpleInteractive ? 'button' : 'div';
  const wrapperProps = isSimpleInteractive
    ? {
        type: 'button',
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      draggable={enableDrag}
      onDragStart={handleDragStart}
      onMouseEnter={() => setIsCardHovering(true)}
      onMouseLeave={() => setIsCardHovering(false)}
      onKeyDown={handleKeyDown}
      onClick={!showActions && onClick ? () => onClick(task) : undefined}
      className={`group w-full rounded-[12px] border bg-[var(--color-surface)] px-3 py-3 text-left shadow-[var(--shadow-xs)] transition-[border-color,background-color,box-shadow,opacity] duration-200 ${
        isCompleted || isGivenUp
          ? 'border-[color:var(--color-line)] bg-[var(--color-surface-muted)]'
          : 'border-[color:var(--color-line)] hover:border-[color:var(--color-accent)]'
      } ${enableDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${
        !enableDrag && onClick && !showActions ? 'cursor-pointer' : ''
      }`}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: accentColor,
      }}
      role={!isSimpleInteractive && onClick && !showActions ? 'button' : undefined}
      tabIndex={!isSimpleInteractive && onClick && !showActions ? 0 : undefined}
      aria-label={!isSimpleInteractive && onClick && !showActions ? `Open task ${task.title}` : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-medium ${
              isCompleted || isGivenUp
                ? 'text-[color:var(--color-text-muted)] line-through'
                : 'text-[color:var(--color-text)]'
            }`}
          >
            {task.title}
          </p>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--color-text-muted)]">
            <span className={statusMeta.tone}>{statusMeta.label}</span>
            {deadlineMeta ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{deadlineMeta.label}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <span className={priorityClassName}>{task.priority}</span>

          {quickActions ? (
            <div className="flex items-center gap-1">
              {isPending && isCardHovering ? (
                <button
                  type="button"
                  onClick={handleStartTask}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-[color:var(--color-line)] px-3 text-xs font-medium text-[color:var(--color-text-muted)] transition-[background-color,border-color,color] duration-150 hover:border-[color:var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[color:var(--color-accent)]"
                  aria-label="Start task"
                >
                  <Play className="h-3 w-3" />
                  <span>Try</span>
                </button>
              ) : null}

              {task.status === 'in-progress' && task.dueDate ? (
                <button
                  type="button"
                  onClick={handleFinishTask}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                  disabled={isFinishing}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] duration-150 ${
                    isFinishing || isHovering
                      ? 'border-[color:var(--color-success)] bg-[var(--color-success-soft)] text-[color:var(--color-success)]'
                      : deadlineMeta?.accent
                        ? 'border-transparent bg-[var(--color-warning-soft)] text-[color:var(--color-warning)]'
                        : 'border-[color:var(--color-line)] bg-[var(--color-surface)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[color:var(--color-accent)]'
                  } ${isFinishing ? 'cursor-default' : ''}`}
                  aria-label="Finish task"
                >
                  {isFinishing || isHovering ? (
                    <CircleCheckBig className="h-4 w-4" />
                  ) : (
                    <AlarmClock className="h-4 w-4" />
                  )}
                </button>
              ) : null}
            </div>
          ) : null}

          {showActions ? (
            <div className="flex items-center gap-1">
              {isPending && isCardHovering ? (
                <button
                  type="button"
                  onClick={handleStartTask}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-[color:var(--color-line)] px-3 text-xs font-medium text-[color:var(--color-text-muted)] transition-[background-color,border-color,color] duration-150 hover:border-[color:var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[color:var(--color-accent)]"
                  aria-label="Start task"
                >
                  <Play className="h-3 w-3" />
                  <span>Try</span>
                </button>
              ) : null}

              {task.status === 'in-progress' && task.dueDate ? (
                <button
                  type="button"
                  onClick={handleFinishTask}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                  disabled={isFinishing}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] duration-150 ${
                    isFinishing || isHovering
                      ? 'border-[color:var(--color-success)] bg-[var(--color-success-soft)] text-[color:var(--color-success)]'
                      : deadlineMeta?.accent
                        ? 'border-transparent bg-[var(--color-warning-soft)] text-[color:var(--color-warning)]'
                        : 'border-[color:var(--color-line)] bg-[var(--color-surface)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[color:var(--color-accent)]'
                  } ${isFinishing ? 'cursor-default' : ''}`}
                  aria-label="Finish task"
                >
                  {isFinishing || isHovering ? (
                    <CircleCheckBig className="h-4 w-4" />
                  ) : (
                    <AlarmClock className="h-4 w-4" />
                  )}
                </button>
              ) : null}

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(task);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[color:var(--color-text-muted)] transition-[background-color,color,border-color] duration-150 hover:border-[color:var(--color-line)] hover:bg-[var(--color-surface-muted)] hover:text-[color:var(--color-accent)]"
                aria-label="Edit task"
              >
                <Pencil className="h-4 w-4" />
              </button>

              {task.status === 'in-progress' ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onGiveUp(task._id);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[color:var(--color-warning)] transition-[background-color,color,border-color] duration-150 hover:border-[color:var(--color-warning)] hover:bg-[var(--color-warning-soft)]"
                  aria-label="Give up task"
                >
                  <Flag className="h-4 w-4" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(task._id);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-[color:var(--color-danger)] transition-[background-color,color,border-color] duration-150 hover:border-[color:var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                aria-label="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </Wrapper>
  );
};

export default TaskCard;
