import { useMemo, useState, memo } from 'react';
import { taskService } from '../../api/apiService';
import { isSameDay, sortTasksByDueTime } from './calendarUtils';
import { formatDateTime, toDateTimeLocalValue, toISOStringLocal } from '../../utils/dateTime';
import { getTaskDragData, setTaskDragData } from '../../utils/taskDrag';

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
  High: { background: '#ef4444' },   // Red
  Medium: { background: '#f59e0b' }, // Amber / Yellow
  Low: { background: '#22c55e' },    // Green
};

const taskPreviewTone = (task) => {
  if (task.status === 'completed' || task.status === 'given-up') {
    return {
      borderColor: 'var(--color-line)',
      background: 'var(--color-surface-muted)',
      metaColor: task.status === 'given-up' ? 'var(--color-danger)' : 'var(--color-text-muted)',
    };
  }

  if (task.isOverDue) {
    return {
      borderColor: 'var(--color-danger-soft)',
      background: 'var(--color-surface)',
      metaColor: 'var(--color-danger)',
    };
  }

  return {
    borderColor: 'var(--color-line)',
    background: 'var(--color-surface)',
    metaColor: 'var(--color-text-muted)',
  };
};

const buildDroppedDueDate = (targetDay, sourceDueDate) => {
  const nextDueDate = new Date(targetDay);
  const sourceDate = sourceDueDate ? new Date(sourceDueDate) : null;

  if (sourceDate && !Number.isNaN(sourceDate.getTime())) {
    nextDueDate.setHours(sourceDate.getHours(), sourceDate.getMinutes(), 0, 0);
    return nextDueDate;
  }

  nextDueDate.setHours(0, 0, 0, 0);
  return nextDueDate;
};

const DayCell = memo(({ day, isToday, isSelected, isCurrentMonth, tasks, onClick, onTaskUpdated, viewMode = 'month' }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const taskCount = tasks?.length || 0;
  const hasOverdue = tasks?.some(task => task.isOverDue);
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

    const { taskId, currentDueDate } = getTaskDragData(e);
    if (!taskId) return;

    if (currentDueDate && isSameDay(currentDueDate, day)) {
      return;
    }

    try {
      const newDueDate = buildDroppedDueDate(day, currentDueDate);

      await taskService.updateTask(taskId, {
        dueDate: toISOStringLocal(toDateTimeLocalValue(newDueDate))
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
        ${isDragOver ? 'shadow-[var(--shadow-sm)] ring-2 ring-[color:var(--color-accent)] ring-offset-2 ring-offset-[var(--color-canvas)]' : ''}
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
        </div>

        {taskCount > 0 && (
          <div className="flex flex-1 flex-col gap-1.5">
            {sortedTasks.slice(0, previewLimit).map((task, idx) => {
              const previewTone = taskPreviewTone(task);
              const taskId = task._id || task.id || `${idx}`;

              return (
              <div
                key={taskId}
                draggable={Boolean(task._id || task.id)}
                onDragStart={(event) => {
                  event.stopPropagation();
                  setTaskDragData(event, task);
                  setDraggingTaskId(taskId);
                }}
                onDragEnd={() => {
                  setDraggingTaskId(null);
                  setIsDragOver(false);
                }}
                className={`rounded-lg border px-2 py-1.5 text-left transition-[border-color,background-color,box-shadow,opacity,transform] duration-150 ${
                  task.status === 'completed' || task.status === 'given-up' ? 'opacity-80' : ''
                } ${draggingTaskId === taskId ? 'opacity-60' : ''} cursor-grab active:cursor-grabbing`}
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
                      task.status === 'completed' || task.status === 'given-up'
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
