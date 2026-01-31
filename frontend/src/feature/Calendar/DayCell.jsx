import { useState, memo } from 'react';
import { taskService } from '../../api/apiService';

const DayCell = memo(({ day, isToday, isSelected, isCurrentMonth, tasks, onClick, onTaskUpdated }) => {
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
      newDueDate.setHours(23, 59, 59, 999);

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
      onClick={() => onClick(day)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        min-h-[80px] p-2 border border-gray-200 rounded-lg transition-all cursor-pointer
        ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : isToday ? 'ring-2 ring-purple-500 bg-purple-50' : isSelected ? 'bg-pink-50 text-gray-900' : 'bg-white text-gray-900'}
        ${isSelected ? 'ring-pink-500 border-pink-500' : 'hover:bg-purple-50'}
        ${isDragOver ? 'ring-2 ring-blue-400 bg-blue-50 scale-105' : ''}
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
              ${hasHighPriority ? 'bg-red-100 text-red-700' : hasMediumPriority ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}
            `}>
              {taskCount}
            </span>
          )}
        </div>
        
        {taskCount > 0 && (
          <div className="flex flex-col gap-0.5 flex-1">
            {tasks.slice(0, 2).map((task, idx) => (
              <div
                key={idx}
                className={`
                  text-xs px-1.5 py-0.5 rounded truncate text-left
                  ${task.status === 'completed' ? 'bg-green-100 text-green-700 line-through' : 
                    task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 
                    task.status === 'pending' ? 'bg-purple-100 text-purple-700' : 
                    'bg-gray-100 text-gray-600'}
                `}
              >
                {task.title}
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
    prevProps.day.getTime() === nextProps.day.getTime() &&
    prevProps.isToday === nextProps.isToday &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isCurrentMonth === nextProps.isCurrentMonth &&
    prevProps.tasks?.length === nextProps.tasks?.length &&
    JSON.stringify(prevProps.tasks) === JSON.stringify(nextProps.tasks)
  );
});

DayCell.displayName = 'DayCell';

export default DayCell;
