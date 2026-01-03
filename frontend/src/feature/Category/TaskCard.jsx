const TaskCard = ({ task }) => {
  const priorityColors = {
    High: 'bg-red-100 text-red-700 border-red-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <div className={`p-3 rounded-lg border-2 transition-all ${
      task.completed 
        ? 'bg-gray-50 border-gray-200 opacity-60' 
        : 'bg-white border-gray-200 hover:border-purple-300'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${
            task.completed ? 'line-through text-gray-500' : 'text-gray-800'
          }`}>
            {task.title}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
          priorityColors[task.priority] || 'bg-gray-100 text-gray-700 border-gray-200'
        }`}>
          {task.priority}
        </span>
      </div>
    </div>
  );
};

export default TaskCard;
