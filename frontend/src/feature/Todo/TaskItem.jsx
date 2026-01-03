import { CircleCheckBig, Frown } from 'lucide-react';

const TaskItem = ({ task, onToggleComplete, onEdit, onGiveUp, onDelete }) => {
  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  const categoryColors = 'bg-purple-100 text-purple-800';

  const getDaysLeft = (deadline) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineColor = (daysLeft) => {
    if (daysLeft < 0) return 'bg-red-100 text-red-700';
    if (daysLeft <= 2) return 'bg-orange-100 text-orange-700';
    if (daysLeft <= 7) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
  };

  const formatDaysLeft = (daysLeft) => {
    if (daysLeft < 0) return `${Math.abs(daysLeft)} days overdue`;
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
  };

  return (
    <div className="bg-white/80 rounded-2xl shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-all">
      <input
        type="checkbox"
        checked={task.status === 'completed'}
        onChange={() => onToggleComplete(task._id)}
        className="mt-1.5 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
      />
      
      <div className="flex-1 min-w-0">
        <h3
          className={`text-[15px] font-medium mb-2.5 ${
            task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'
          }`}
        >
          {task.title}
        </h3>
        <div className="flex gap-2 mt-3">
          {task.categoryId?.name && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors || 'bg-gray-100 text-gray-800'}`}
            >
              {task.categoryId.name}
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              priorityColors[task.priority?.toLowerCase()] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {task.priority?.toLowerCase()}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(task)}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
            aria-label="Edit task"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {task.status === 'in-progress' && (
            <button
              onClick={() => onGiveUp(task._id)}
              className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all"
              aria-label="Give up task"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onDelete(task._id)}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
            aria-label="Delete task"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {task.dueDate && task.status !== 'completed' && task.status !== 'given-up' && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDeadlineColor(getDaysLeft(task.dueDate))}`}>
            {formatDaysLeft(getDaysLeft(task.dueDate))}
          </span>
        )}
        {task.status === 'completed' && task.completedAt && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1.5">
            <CircleCheckBig className="w-3.5 h-3.5" />
            <span>Done at {new Date(task.completedAt).toLocaleDateString()}</span>
          </span>
        )}
        {task.status === 'given-up' && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 flex items-center gap-1.5">
            <Frown className="w-3.5 h-3.5" />
            <span>Given Up</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskItem;

