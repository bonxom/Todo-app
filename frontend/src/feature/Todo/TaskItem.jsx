const TaskItem = ({ task, onToggleComplete, onEdit, onDelete }) => {
  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  const categoryColors = {
    Work: 'bg-gray-100 text-gray-800',
    Personal: 'bg-blue-100 text-blue-800',
    Shopping: 'bg-purple-100 text-purple-800',
    Health: 'bg-green-100 text-green-800',
  };

  return (
    <div className="bg-white/80 rounded-2xl shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-all">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggleComplete(task.id)}
        className="mt-1.5 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
      />
      
      <div className="flex-1 min-w-0">
        <h3
          className={`text-[15px] font-medium mb-2.5 ${
            task.completed ? 'line-through text-gray-400' : 'text-gray-900'
          }`}
        >
          {task.title}
        </h3>
        <div className="flex gap-2 mt-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              categoryColors[task.category] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {task.category}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              priorityColors[task.priority?.toLowerCase()] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {task.priority?.toLowerCase()}
          </span>
        </div>
      </div>
      
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
        <button
          onClick={() => onDelete(task.id)}
          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
          aria-label="Delete task"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TaskItem;

