import { useState } from 'react';
import { AlarmClock, CircleCheckBig, Play } from 'lucide-react';
import { taskService } from '../../api/apiService';

const TaskCard = ({ task, onClick, showActions, quickActions, onEdit, onGiveUp, onDelete, onTaskUpdated }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isCardHovering, setIsCardHovering] = useState(false);
  const priorityColors = {
    High: 'bg-red-100 text-red-700 border-red-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low: 'bg-green-100 text-green-700 border-green-200',
  };

  const getDaysLeft = (deadline) => {
    if (!deadline) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineColor = (daysLeft) => {
    if (daysLeft === null) return 'bg-gray-100 text-gray-600';
    if (daysLeft < 0) return 'bg-red-100 text-red-700';
    if (daysLeft <= 2) return 'bg-orange-100 text-orange-700';
    if (daysLeft <= 7) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
  };

  const handleFinishTask = async (e) => {
    e.stopPropagation();
    if (isFinishing) return;
    
    try {
      setIsFinishing(true);
      await taskService.finishTask(task._id);
      // Use a small delay to show the green check before updating
      setTimeout(() => {
        if (onTaskUpdated) {
          onTaskUpdated();
        }
        setIsFinishing(false);
      }, 500);
    } catch (error) {
      console.error('Failed to finish task:', error);
      alert('Failed to finish task.');
      setIsFinishing(false);
    }
  };

  const handleStartTask = async (e) => {
    e.stopPropagation();
    
    try {
      await taskService.startTask(task._id);
      if (onTaskUpdated) {
        onTaskUpdated();
      }
    } catch (error) {
      console.error('Failed to start task:', error);
      alert('Failed to start task.');
    }
  };

  const handleDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', task._id);
    e.dataTransfer.setData('currentCategoryId', task.categoryId?._id || task.categoryId);
  };

  // Determine card background and border based on status and isOverDue
  const getCardStyles = () => {
    if (task.isOverDue) {
      return 'bg-red-50 border-red-300';
    }
    
    switch (task.status) {
      case 'pending':
        return 'bg-purple-50 border-purple-200';
      case 'in-progress':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'given-up':
        return 'bg-gray-100 border-gray-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const isCompleted = task.status === 'completed';
  const isGivenUp = task.status === 'given-up';
  const isPending = task.status === 'pending';

  return (
    <div 
      draggable={!isCompleted && !isGivenUp}
      onDragStart={handleDragStart}
      onMouseEnter={() => setIsCardHovering(true)}
      onMouseLeave={() => setIsCardHovering(false)}
      className={`p-3 rounded-lg border-2 transition-all select-none ${getCardStyles()} ${
        isCompleted || isGivenUp ? 'opacity-60' : 'hover:border-purple-400'
      } ${onClick && !showActions ? 'cursor-pointer' : ''} ${!isCompleted && !isGivenUp ? 'cursor-move' : ''}`}
      onClick={!showActions && onClick ? () => onClick(task) : undefined}
      style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${
            isCompleted || isGivenUp ? 'line-through text-gray-500' : 'text-gray-800'
          }`}>
            {task.title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
            priorityColors[task.priority] || 'bg-gray-100 text-gray-700 border-gray-200'
          }`}>
            {task.priority}
          </span>
          {quickActions && (
            <div className="flex items-center gap-1">
              {isPending && isCardHovering && (
                <button
                  onClick={handleStartTask}
                  className="px-2 py-1 text-xs font-medium text-purple-600 border-2 border-dashed border-purple-400 hover:bg-purple-50 rounded-lg transition-all flex items-center gap-1"
                  aria-label="Start task"
                >
                  <Play className="w-3 h-3" />
                  Try
                </button>
              )}
              {task.status === 'in-progress' && task.dueDate && (
                <button
                  onClick={handleFinishTask}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                  disabled={isFinishing}
                  className={`p-1.5 rounded-lg transition-all duration-300 relative ${
                    isFinishing ? 'bg-green-100' : getDeadlineColor(getDaysLeft(task.dueDate))
                  } ${isFinishing ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
                  aria-label="Finish task"
                >
                  {isFinishing || isHovering ? (
                    <CircleCheckBig 
                      className={`w-4 h-4 text-green-600 ${
                        isFinishing || isHovering ? 'animate-pulse' : ''
                      }`} 
                      style={{
                        filter: isFinishing || isHovering ? 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.6))' : 'none'
                      }}
                    />
                  ) : (
                    <AlarmClock className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          )}
          {showActions && (
            <div className="flex items-center gap-1">
              {isPending && isCardHovering && (
                <button
                  onClick={handleStartTask}
                  className="px-2 py-1 text-xs font-medium text-purple-600 border-2 border-dashed border-purple-400 hover:bg-purple-50 rounded-lg transition-all flex items-center gap-1"
                  aria-label="Start task"
                >
                  <Play className="w-3 h-3" />
                  Try
                </button>
              )}
              {task.status === 'in-progress' && task.dueDate && (
                <button
                  onClick={handleFinishTask}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                  disabled={isFinishing}
                  className={`p-1.5 rounded-lg transition-all duration-300 relative ${
                    isFinishing ? 'bg-green-100' : getDeadlineColor(getDaysLeft(task.dueDate))
                  } ${isFinishing ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
                  aria-label="Finish task"
                >
                  {isFinishing || isHovering ? (
                    <CircleCheckBig 
                      className={`w-4 h-4 text-green-600 ${
                        isFinishing || isHovering ? 'animate-pulse' : ''
                      }`} 
                      style={{
                        filter: isFinishing || isHovering ? 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.6))' : 'none'
                      }}
                    />
                  ) : (
                    <AlarmClock className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                aria-label="Edit task"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              {task.status === 'in-progress' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGiveUp(task._id);
                  }}
                  className="p-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-all"
                  aria-label="Give up task"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task._id);
                }}
                className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                aria-label="Delete task"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default TaskCard;
