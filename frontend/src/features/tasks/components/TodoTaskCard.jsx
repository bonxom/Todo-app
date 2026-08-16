import { useState } from 'react';
import {
  Check,
  CircleDot,
  Clock,
  Flag,
  Loader2,
  Pencil,
  RotateCcw,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { formatDateTime } from '@/shared/utils/dateTime';
import { getProjectColor } from '@/shared/utils/projectColor';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    badgeClass: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-transparent',
  },
  'in-progress': {
    label: 'In Progress',
    badgeClass: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-transparent',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent',
  },
  'given-up': {
    label: 'Given Up',
    badgeClass: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent',
  },
};

const PRIORITY_CONFIG = {
  High: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent',
  high: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent',
  Medium: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-transparent',
  medium: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-transparent',
  Low: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent',
  low: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent',
};

const getDaysLeft = (deadline) => {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const TodoTaskCard = ({
  task,
  onAccept,
  onDeny,
  onComplete,
  onGiveUp,
  onRestore,
  onEdit,
  onDelete,
}) => {
  const [isActionPending, setIsActionPending] = useState(false);
  const taskId = task._id || task.id;
  const isPending = task.status === 'pending';
  const isCompleted = task.status === 'completed';
  const isGivenUp = task.status === 'given-up';
  const isInProgress = task.status === 'in-progress';
  const isMuted = isCompleted || isGivenUp;

  const projectColor = task.projectId ? getProjectColor(task.projectId) : null;
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const priorityClass = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;
  const daysLeft = getDaysLeft(task.dueDate);

  const handleAction = async (fn) => {
    if (isActionPending || !fn) return;
    try {
      setIsActionPending(true);
      await fn(taskId);
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <article
      className={`ui-section-card relative p-4 transition-all duration-200 hover:shadow-xs ${
        isMuted ? 'opacity-80 bg-[var(--color-surface-muted)]' : 'bg-[var(--color-surface)]'
      }`}
      style={{
        borderLeftColor: projectColor || 'var(--color-line)',
        borderLeftWidth: '5px',
        borderStyle: isPending ? 'dashed' : 'solid',
        borderColor: isPending ? 'var(--color-line)' : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Left Action Button (Status Specific) */}
        <div className="mt-0.5 shrink-0">
          {isPending && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAction(onAccept)}
                disabled={isActionPending}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--color-success)] bg-[var(--color-success-soft)] px-2.5 text-xs font-semibold text-[var(--color-success)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                aria-label={`Accept ${task.title}`}
                title="Accept task to in-progress"
              >
                {isActionPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                <span>Accept</span>
              </button>
              <button
                type="button"
                onClick={() => handleAction(onDeny)}
                disabled={isActionPending}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-2.5 text-xs font-semibold text-[var(--color-danger)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                aria-label={`Deny and delete ${task.title}`}
                title="Deny and delete task"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                <span>Deny</span>
              </button>
            </div>
          )}

          {isInProgress && (
            <button
              type="button"
              onClick={() => handleAction(onComplete)}
              disabled={isActionPending}
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] text-transparent hover:border-[var(--color-success)] hover:bg-[var(--color-success-soft)] hover:text-[var(--color-success)] transition-all hover:scale-110 active:scale-90 cursor-pointer"
              aria-label={`Mark ${task.title} as completed`}
              title="Mark as completed"
            >
              {isActionPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-accent)]" /> : <Check className="h-4 w-4" />}
            </button>
          )}

          {isCompleted && (
            <button
              type="button"
              onClick={() => handleAction(onRestore)}
              disabled={isActionPending}
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--color-success)] bg-[var(--color-success)] text-white hover:opacity-90 transition-all cursor-pointer"
              aria-label={`Restore ${task.title} to in-progress`}
              title="Click to restore to in-progress"
            >
              {isActionPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
          )}

          {isGivenUp && (
            <button
              type="button"
              onClick={() => handleAction(onRestore)}
              disabled={isActionPending}
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger)] text-white hover:opacity-90 transition-all cursor-pointer"
              aria-label={`Restore ${task.title} to in-progress`}
              title="Click to restore to in-progress"
            >
              {isActionPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm font-semibold leading-snug transition-colors ${
              isMuted ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'
            }`}
          >
            {task.title}
          </h3>

          {task.description && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)] line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Badges row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {/* Status chip */}
            <span className={`ui-chip ui-tabular ${statusCfg.badgeClass}`}>
              <CircleDot className="h-3 w-3" />
              {statusCfg.label}
            </span>

            {/* Priority chip */}
            {task.priority && (
              <span className={`ui-chip ${priorityClass}`}>
                {task.priority}
              </span>
            )}

            {/* Project chip */}
            {task.projectId?.name && (
              <span className="ui-chip ui-chip--accent">
                {task.projectId.name}
              </span>
            )}

            {/* Category chip */}
            {task.categoryId?.name && (
              <span className="ui-chip">
                <Tag className="h-3 w-3" />
                {task.categoryId.name}
              </span>
            )}

            {/* Due date badge */}
            {task.dueDate && !isMuted && (
              <span
                className={`ui-chip ui-tabular ${
                  daysLeft !== null && daysLeft < 0
                    ? 'ui-chip--danger'
                    : daysLeft !== null && daysLeft <= 2
                    ? 'ui-chip--warning'
                    : ''
                }`}
              >
                <Clock className="h-3 w-3" />
                {daysLeft !== null && daysLeft < 0
                  ? `${Math.abs(daysLeft)}d overdue`
                  : daysLeft === 0
                  ? 'Due today'
                  : `${daysLeft}d left`}
              </span>
            )}

            {/* Completed timestamp */}
            {isCompleted && task.completedAt && (
              <span className="ui-chip ui-chip--success ui-tabular">
                Done {formatDateTime(task.completedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex shrink-0 items-center gap-1">
          {isInProgress && (
            <button
              type="button"
              onClick={() => onGiveUp?.(taskId)}
              disabled={isActionPending}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-warning)] hover:bg-[var(--color-warning-soft)] transition-colors cursor-pointer"
              aria-label={`Give up ${task.title}`}
              title="Give up task"
            >
              <Flag className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit?.(task)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            aria-label={`Edit ${task.title}`}
            title="Edit task"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(taskId)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors cursor-pointer"
            aria-label={`Delete ${task.title}`}
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default TodoTaskCard;
