import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Folder, ChevronDown, X } from 'lucide-react';
import TaskCard from './TaskCard';
import CategoryDetailModal from './CategoryDetailModal';
import TaskDetailButton from '../Todo/TaskDetailButton';
import DeleteCategoryDialog from '../Dialog/DeleteCategoryDialog';
import { categoryService, taskService } from '../../api/apiService';

const CategoryCard = ({ category, tasks, onTaskUpdated, categoryId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await categoryService.deleteCategory(categoryId);
      setIsDeleteDialogOpen(false);
      if (onTaskUpdated) {
        onTaskUpdated();
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert(error.response?.data?.message || 'Failed to delete category. Please try again.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
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
    const currentCategoryId = e.dataTransfer.getData('currentCategoryId');
    
    // Don't update if dropping in the same category
    if (currentCategoryId === categoryId) {
      return;
    }
    
    try {
      await taskService.updateTask(taskId, { categoryId });
      if (onTaskUpdated) {
        onTaskUpdated();
      }
    } catch (error) {
      console.error('Failed to move task:', error);
      alert(error.response?.data?.message || 'Failed to move task to this category.');
    }
  };
  
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const totalTasks = tasks.length;
  const displayTasks = tasks.slice(0, 3);
  const hasMore = tasks.length > 3;

  return (
    <>
      {isEditModalOpen && createPortal(
        <TaskDetailButton
          isOpen={isEditModalOpen}
          task={selectedTask}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTask(null);
          }}
          onTaskUpdated={onTaskUpdated}
        />,
        document.body
      )}

      <CategoryDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={category}
        tasks={tasks}
        onTaskUpdated={onTaskUpdated}
      />
      
      <div 
        className={`bg-white rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 overflow-hidden relative ${
          isDragOver ? 'ring-4 ring-purple-400 ring-opacity-50 scale-105' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Delete Button */}
        {category !== 'Uncategorized' && (
          <button
            onClick={handleDeleteClick}
            className="absolute top-2 right-2 z-10 w-7 h-7 bg-red-400 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg"
            aria-label="Delete category"
          >
            <X className="w-4 h-4" />
          </button>
        )}

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
                  quickActions={true}
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

      {/* Delete Confirmation Dialog */}
      <DeleteCategoryDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        categoryName={category}
      />

    </>
  );
};

export default CategoryCard;
