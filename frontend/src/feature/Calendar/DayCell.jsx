import { useState, memo } from 'react';
import { taskService } from '../../api/apiService';
import { isSameDay } from './calendarUtils';
import { formatDateTime } from '../../utils/dateTime';

const priorityClassNames = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-emerald-100 text-emerald-700',
};

const statusAccentClassNames = {
  completed: 'border-emerald-300',
  'in-progress': 'border-blue-300',
  pending: 'border-purple-300',
  'given-up': 'border-slate-300',
};

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

const DayCell = memo(({ day, isToday, isSelected, isCurrentMonth, tasks, onClick, onTaskUpdated, viewMode = 'month' }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const taskCount = tasks?.length || 0;
  const hasHighPriority = tasks?.some(task => task.priority === 'High');
  const hasMediumPriority = tasks?.some(task => task.priority === 'Medium');
  const hasOverdue = tasks?.some(task => task.isOverDue);

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

      await taskService.updateTask(taskId, {
        dueDate: newDueDate.toISOString()
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
        border border-gray-200 rounded-[1.25rem] transition-all cursor-pointer text-left
        ${viewMode === 'week' ? 'min-h-[120px] p-3' : 'min-h-[88px] p-2.5'}
        ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : isToday ? 'ring-2 ring-purple-500 bg-purple-50' : isSelected ? 'bg-pink-50 text-gray-900' : 'bg-white text-gray-900'}
        ${isSelected ? 'ring-pink-500 border-pink-500 shadow-sm' : 'hover:bg-purple-50'}
        ${isDragOver ? 'ring-2 ring-blue-400 bg-blue-50 scale-105' : ''}
        ${hasOverdue && !isSelected ? 'border-orange-200' : ''}
      `}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${isToday ? 'text-purple-700' : ''}`}>
            {day.getDate()}
          </span>
          {taskCount > 0 && (
            <span className={`
              text-xs px-1.5 py-0.5 rounded-full font-semibold
              ${hasHighPriority ? 'bg-red-100 text-red-700' : hasOverdue ? 'bg-orange-100 text-orange-700' : hasMediumPriority ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}
            `}>
              {taskCount}
            </span>
          )}
        </div>
        
        {taskCount > 0 && (
          <div className="flex flex-col gap-1.5 flex-1">
            {tasks.slice(0, 2).map((task, idx) => (
              <div
                key={task._id || task.id || idx}
                className={`
                  rounded-lg border bg-white/85 px-1.5 py-1 text-left shadow-sm
                  ${statusAccentClassNames[task.status] || 'border-gray-200'}
                  ${task.status === 'completed' ? 'opacity-75' : ''}
                `}
                title={`${task.title} • ${task.priority || 'Medium'} • ${formatDateTime(task.dueDate, 'No due date')}`}
              >
                <div className={`truncate text-[11px] font-semibold ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                  {task.title}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${priorityClassNames[task.priority] || 'bg-slate-100 text-slate-600'}`}>
                    {task.priority || 'Medium'}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                    {formatCellTime(task.dueDate)}
                  </span>
                </div>
              </div>
            ))}
            {taskCount > 2 && (
              <span className="text-xs text-gray-500 mt-0.5">+{taskCount - 2} more</span>
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
