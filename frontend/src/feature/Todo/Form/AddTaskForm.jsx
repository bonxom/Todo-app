import { useState, useEffect } from 'react';
import AddCategoryForm from './AddCategoryForm';
import { taskService, categoryService } from '../../../api/apiService';

const AddTaskForm = ({ onClose, onTaskCreated }) => {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      const categoriesData = Array.isArray(response) ? response : response.categories;
      if (categoriesData && categoriesData.length > 0) {
        setCategories(categoriesData);
        setCategoryId(categoriesData[0]?._id || '');
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleReset = () => {
    setTitle('');
    setCategoryId(categories[0]?._id || '');
    setPriority('Medium');
    setDueDate('');
    setDescription('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      const newTask = {
        title,
        categoryId,
        priority,
        status: 'in-progress',
        dueDate: dueDate,
        description,
      };
      
      await taskService.createTask(newTask);
      
      if (onTaskCreated) {
        onTaskCreated();
      }
      
      handleReset();
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title..."
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => {
                if (e.target.value === '__add_more__') {
                  setShowAddCategory(true);
                } else {
                  setCategoryId(e.target.value);
                }
              }}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
            >
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
              <option value="__add_more__" className="text-purple-600 font-medium">+ Add more</option>
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
            Due Date <span className="text-red-500">*</span>
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="flex-1 h-11 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </form>

      {showAddCategory && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 rounded-t-2xl">
              <h2 className="text-xl font-semibold text-gray-900">Add Category</h2>
            </div>
            <div className="px-6 py-5">
              <AddCategoryForm 
                onClose={() => setShowAddCategory(false)} 
                onCategoryCreated={fetchCategories}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddTaskForm;
