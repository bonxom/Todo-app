import { useState, useEffect } from 'react';
import AddCategoryForm from './AddCategoryForm';
import { taskService, categoryService } from '../../../api/apiService';

const TaskDetailForm = ({ task, onClose, onTaskUpdated }) => {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'in-progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'given-up':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'given-up':
        return 'Given Up';
      default:
        return status;
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async (selectCategoryId) => {
    try {
      const response = await categoryService.getAllCategories();
      const categoriesData = Array.isArray(response) ? response : response.categories;
      if (categoriesData) {
        setCategories(categoriesData);
        if (selectCategoryId) {
          setCategoryId(selectCategoryId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    if (task && categories.length > 0 && !categoryId) {
      setTitle(task.title || '');
      setCategoryId(task.categoryId?._id || categories[0]?._id || '');
      setPriority(task.priority || 'Medium');
      setStartDate(formatDateForInput(task.startDate));
      setDueDate(formatDateForInput(task.dueDate));
      setDescription(task.description || '');
    }
  }, [task, categories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      const updatedTask = {
        title,
        categoryId: categoryId || undefined,
        priority,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        description,
      };
      
      console.log('Submitting updated task:', updatedTask);
      
      await taskService.updateTask(task._id, updatedTask);
      
      if (onTaskUpdated) {
        onTaskUpdated();
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-2">
            Task Title <span className="text-red-500">*</span>
          </label>
        <input
          id="edit-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title..."
          className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
          required
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <div
          className={`w-full h-11 px-4 rounded-xl border-2 flex items-center text-[15px] font-medium ${getStatusColor(task?.status)}`}
        >
          {getStatusLabel(task?.status)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            id="edit-category"
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
          <label htmlFor="edit-priority" className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <select
            id="edit-priority"
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-startDate" className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            id="edit-startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
          />
        </div>

        <div>
          <label htmlFor="edit-dueDate" className="block text-sm font-medium text-gray-700 mb-2">
            Due Date <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="edit-description"
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
          onClick={onClose}
          className="flex-1 h-11 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
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
                onCategoryCreated={(newCategory) => {
                  fetchCategories(newCategory?._id || newCategory?.category?._id);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskDetailForm;
