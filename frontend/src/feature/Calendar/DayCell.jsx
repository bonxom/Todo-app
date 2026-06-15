import { useMemo, useState, memo } from 'react';
import { taskService } from '../../api/apiService';
import { isSameDay, sortTasksByDueTime } from './calendarUtils';
import { formatDateTime, toISOStringLocal } from '../../utils/dateTime';

const formatCellTime = (value) => {
  if (!value) return 'No due';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due';

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const priorityDotStyle = {
  High: { background: 'var(--color-danger)' },
  Medium: { background: 'var(--color-warning)' },
  Low: { background: 'var(--color-success)' },
};

const taskPreviewTone = (task) => {
  if (task.isOverDue) {
    return {
      borderColor: 'var(--color-danger-soft)',
      background: 'var(--color-surface)',
      metaColor: 'var(--color-danger)',
    };
  }

  if (task.status === 'completed') {
    return {
      borderColor: 'var(--color-line)',
      background: 'var(--color-surface-muted)',
      metaColor: 'var(--color-text-muted)',
    };
  }

  return {
    borderColor: 'var(--color-line)',
    background: 'var(--color-surface)',
    metaColor: 'var(--color-text-muted)',
  };
};

const DayCell = memo(({ day, isToday, isSelected, isCurrentMonth, tasks, onClick, onTaskUpdated, viewMode = 'month' }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const taskCount = tasks?.length || 0;
  const hasOverdue = tasks?.some(task => task.isOverDue);
  const hasHighPriority = tasks?.some(task => task.priority === 'High');
  const previewLimit = viewMode === 'week' ? 3 : 2;
  const sortedTasks = useMemo(() => {
    return sortTasksByDueTime(tasks || []);
  }, [tasks]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    try {
      // Set dueDate to the day being dropped on
      const newDueDate = new Date(day);
      newDueDate.setHours(0, 0, 0, 0);

      const pad = (v) => String(v).padStart(2, '0');
      const localValue = `${newDueDate.getFullYear()}-${pad(newDueDate.getMonth() + 1)}-${pad(newDueDate.getDate())}T00:00`;

      await taskService.updateTask(taskId, {
        dueDate: toISOStringLocal(localValue)
      });

      if (onTaskUpdated) {
        onTaskUpdated();
      }
    } catch (error) {
      console.error('Failed to update task deadline:', error);
      alert('Failed to update task deadline.');
    }
  };

  return (
    <button
      type="button"
      onClick={() => onClick(day)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        cursor-pointer rounded-[14px] border text-left transition-[background-color,border-color,box-shadow,transform] duration-150
        ${viewMode === 'week' ? 'min-h-[132px] p-3' : 'min-h-[96px] p-2.5'}
        ${!isCurrentMonth ? 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}
        ${isSelected ? 'shadow-[var(--shadow-xs)]' : ''}
        ${isDragOver ? 'shadow-[var(--shadow-sm)]' : ''}
      `}
      style={{
        borderColor: isSelected || isToday
          ? 'var(--color-accent)'
          : hasOverdue
            ? 'var(--color-danger-soft)'
            : 'var(--color-line)',
        background: isDragOver
          ? 'var(--color-accent-soft)'
          : isSelected
            ? 'var(--color-accent-soft)'
            : isToday
              ? 'color-mix(in srgb, var(--color-accent-soft) 58%, var(--color-surface))'
              : isCurrentMonth
                ? 'var(--color-surface)'
                : 'var(--color-surface-muted)',
        transform: isDragOver ? 'translateY(-1px)' : undefined,
      }}
    >
      <div className="flex flex-col h-full">
        <div className="mb-1 flex items-center justify-between">
          <span
            className={`text-sm font-semibold ${isCurrentMonth ? '' : 'opacity-75'}`}
            style={{ color: isToday || isSelected ? 'var(--color-accent)' : undefined }}
          >
            {day.getDate()}
          </span>
          {taskCount > 0 && (
            <span
              className="ui-chip ui-tabular min-h-0 px-2 py-1 text-[11px]"
              style={{
                background: hasOverdue
                  ? 'var(--color-danger-soft)'
                  : hasHighPriority
                    ? 'var(--color-accent-soft)'
                    : 'var(--color-surface-muted)',
                borderColor: hasOverdue ? 'transparent' : 'var(--color-line)',
                color: hasOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)',
              }}
            >
              {taskCount}
            </span>
          )}
        </div>

        {taskCount > 0 && (
          <div className="flex flex-1 flex-col gap-1.5">
            {sortedTasks.slice(0, previewLimit).map((task, idx) => {
              const previewTone = taskPreviewTone(task);

              return (
              <div
                key={task._id || task.id || idx}
                className={`rounded-lg border px-2 py-1.5 text-left ${task.status === 'completed' ? 'opacity-80' : ''}`}
                style={{
                  borderColor: previewTone.borderColor,
                  background: previewTone.background,
                }}
                title={`${task.title} • ${task.priority || 'Medium'} • ${formatDateTime(task.dueDate, 'No due date')}`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={priorityDotStyle[task.priority] || { background: 'var(--color-text-muted)' }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className={`truncate text-[11px] font-semibold ${
                      task.status === 'completed'
                        ? 'text-[var(--color-text-muted)] line-through'
                        : 'text-[var(--color-text)]'
                    }`}>
                      {task.title}
                    </div>
                    <div
                      className="mt-0.5 text-[10px]"
                      style={{ color: previewTone.metaColor }}
                    >
                      <span className="ui-tabular">{formatCellTime(task.dueDate)}</span>
                      {task.priority === 'High' ? ' · High' : ''}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
            {taskCount > previewLimit && (
              <span className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                +{taskCount - previewLimit} more
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    isSameDay(prevProps.day, nextProps.day) &&
    prevProps.isToday === nextProps.isToday &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isCurrentMonth === nextProps.isCurrentMonth &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.tasks?.length === nextProps.tasks?.length &&
    JSON.stringify(prevProps.tasks) === JSON.stringify(nextProps.tasks)
  );
});

DayCell.displayName = 'DayCell';

export default DayCell;
