import { useState } from 'react';
import { CircleCheckBig, Frown, Play, Pencil, Trash2, Flag } from 'lucide-react';
import { formatDateTime } from '../../utils/dateTime';

const TaskItem = ({ task, onToggleComplete, onEdit, onStart, onGiveUp, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getDaysLeft = (deadline) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineChip = (daysLeft) => {
    if (daysLeft < 0) return 'ui-chip--danger';
    if (daysLeft <= 2) return 'ui-chip--warning';
    return '';
  };

  const formatDaysLeft = (daysLeft) => {
    if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft}d left`;
  };

  const isPending = task.status === 'pending';

  return (
    <div 
      className={`ui-section-card p-4 flex items-start gap-4 transition-[border-color,box-shadow] duration-200 hover:border-[var(--color-accent)] ${
        isPending ? 'border-dashed' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <input
        type="checkbox"
        checked={task.status === 'completed'}
        onChange={() => onToggleComplete(task._id)}
        className="mt-1 h-5 w-5 rounded border-[var(--color-line)] accent-[var(--color-accent)] cursor-pointer"
        aria-label={task.status === 'completed' ? `Mark ${task.title} as in progress` : `Mark ${task.title} as completed`}
      />
      
      <div className="flex-1 min-w-0">
        <h3
          className={`text-[15px] font-medium leading-snug ${
            task.status === 'completed' ? 'line-through text-[var(--color-text-muted)]' : 
            isPending ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'
          }`}
        >
          {task.title}
        </h3>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {task.projectId?.name && (
            <span className="ui-chip ui-chip--accent">{task.projectId.name}</span>
          )}
          {task.categoryId?.name && (
            <span className="ui-chip">{task.categoryId.name}</span>
          )}
          {task.priority && (
            <span className={`ui-chip ${task.priority.toLowerCase() === 'high' ? 'ui-chip--danger' : task.priority.toLowerCase() === 'low' ? 'ui-chip--success' : 'ui-chip--warning'}`}>
              {task.priority.toLowerCase()}
            </span>
          )}
          {isPending && (
            <span className="ui-chip">Pending</span>
          )}
          {task.dueDate && task.status !== 'completed' && task.status !== 'given-up' && (
            <span className={`ui-chip ui-tabular ${getDeadlineChip(getDaysLeft(task.dueDate))}`}>
              {formatDaysLeft(getDaysLeft(task.dueDate))}
            </span>
          )}
          {task.status === 'completed' && task.completedAt && (
            <span className="ui-chip ui-chip--success">
              <CircleCheckBig className="h-3.5 w-3.5" aria-hidden="true" />
              Done {formatDateTime(task.completedAt)}
            </span>
          )}
          {task.status === 'given-up' && (
            <span className="ui-chip">
              <Frown className="h-3.5 w-3.5" aria-hidden="true" />
              Given up
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1 shrink-0">
        {isPending && isHovered && (
          <button
            type="button"
            onClick={() => onStart(task._id)}
            className="ui-btn-secondary !min-h-[2rem] !px-3 !text-xs"
            aria-label={`Start ${task.title}`}
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            Start
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-[background-color,color] duration-150 hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
          aria-label={`Edit ${task.title}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        {task.status === 'in-progress' && (
          <button
            type="button"
            onClick={() => onGiveUp(task._id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-warning)] transition-[background-color,color] duration-150 hover:bg-[var(--color-warning-soft)]"
            aria-label={`Give up ${task.title}`}
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(task._id)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-danger)] transition-[background-color,color] duration-150 hover:bg-[var(--color-danger-soft)]"
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default TaskItem;
