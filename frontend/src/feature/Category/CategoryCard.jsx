import { useState } from 'react';
import { Folder, ChevronDown } from 'lucide-react';
import TaskCard from './TaskCard';
import CategoryDetailModal from './CategoryDetailModal';
import TaskDetailButton from '../Todo/TaskDetailButton';

const CategoryCard = ({ category, tasks, onTaskUpdated }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };
  
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const totalTasks = tasks.length;
  const displayTasks = tasks.slice(0, 3);
  const hasMore = tasks.length > 3;

  return (
    <>
      <TaskDetailButton
        isOpen={isEditModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onTaskUpdated={onTaskUpdated}
      />

      <CategoryDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={category}
        tasks={tasks}
        onTaskUpdated={onTaskUpdated}
      />
      
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 overflow-hidden">
        {/* Category Header */}
        <div 
          className="bg-gradient-to-r from-violet-200 to-pink-100 border-b border-gray-200 p-4 cursor-pointer hover:from-violet-300 hover:to-pink-200 transition-all select-none"
          onClick={() => setIsModalOpen(true)}
          style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Folder className="w-6 h-6 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">{category}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{completedTasks}/{totalTasks} completed</span>
          </div>
        </div>

        {/* Tasks List */}
        <div className="p-4 space-y-2">
          {displayTasks.length > 0 ? (
            <>
              {displayTasks.map((task) => (
                <TaskCard 
                  key={task._id || task.id} 
                  task={task}
                  onClick={handleTaskClick}
                  onTaskUpdated={onTaskUpdated}
                />
              ))}
              
              {hasMore && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-all text-gray-600 hover:text-purple-600 font-medium text-sm flex items-center justify-center gap-2"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>View {tasks.length - 3} more tasks</span>
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No tasks in this category</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CategoryCard;
