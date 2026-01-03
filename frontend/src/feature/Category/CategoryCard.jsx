import { Folder } from 'lucide-react';
import TaskCard from './TaskCard';

const CategoryCard = ({ category, tasks }) => {
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 overflow-hidden">
      {/* Category Header */}
      <div className="bg-gradient-to-r from-violet-200 to-pink-100 border-b border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-2">
          <Folder className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">{category}</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{completedTasks}/{totalTasks} completed</span>
        </div>
      </div>

      {/* Tasks List */}
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No tasks in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryCard;
