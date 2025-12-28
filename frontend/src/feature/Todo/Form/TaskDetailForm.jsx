import { useState, useEffect } from 'react';
import AddCategoryForm from './AddCategoryForm';

const TaskDetailForm = ({ task, onClose }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Personal');
  const [priority, setPriority] = useState('Medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setCategory(task.category || 'Personal');
      setPriority(task.priority || 'Medium');
      setStartDate(task.startDate || '');
      setDueDate(task.dueDate || '');
      setDescription(task.description || '');
    }
  }, [task]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Handle form submission
    console.log({ 
      id: task.id,
      title, 
      category, 
      priority, 
      startDate,
      dueDate, 
      description,
      completed: task.completed
    });
    onClose();
  };

  return (
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            id="edit-category"
            value={category}
            onChange={(e) => {
              if (e.target.value === '__add_more__') {
                setShowAddCategory(true);
              } else {
                setCategory(e.target.value);
              }
            }}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
          >
            <option value="Personal">Personal</option>
            <option value="Work">Work</option>
            <option value="Shopping">Shopping</option>
            <option value="Health">Health</option>
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
            Due Date
          </label>
          <input
            id="edit-dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
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
          className="flex-1 h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-md transition-all"
        >
          Save Changes
        </button>
      </div>

      {showAddCategory && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 rounded-t-2xl">
              <h2 className="text-xl font-semibold text-gray-900">Add Category</h2>
            </div>
            <div className="px-6 py-5">
              <AddCategoryForm onClose={() => setShowAddCategory(false)} />
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default TaskDetailForm;
