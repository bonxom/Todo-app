import { useState, useEffect } from 'react';
import { categoryService } from '../../api/apiService';

const AddTaskForm = ({ onAddTask }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getAllCategories();
        const categoriesData = Array.isArray(response) ? response : response.categories;
        if (categoriesData && categoriesData.length > 0) {
          setCategories(categoriesData);
          setCategory(categoriesData[0]?.name || '');
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onAddTask({
        title: title.trim(),
        category,
        priority,
      });
      setTitle('');
      setCategory(categories[0]?.name || '');
      setPriority('Medium');
    }
  };

  return (
    <div className="bg-white/80 rounded-2xl shadow-sm p-6 mb-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 h-12 px-4 rounded-2xl border border-gray-200 bg-white/80 text-[15px] text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
          />
          <button
            type="submit"
            className="h-12 bg-gray-800 hover:bg-gray-900 text-white px-6 rounded-2xl flex items-center gap-2 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add</span>
          </button>
        </div>
        
        <div className="flex gap-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 px-4 rounded-2xl border border-gray-200 bg-white/80 text-[15px] text-gray-900 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
          >
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-12 px-4 rounded-2xl border border-gray-200 bg-white/80 text-[15px] text-gray-900 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </form>
    </div>
  );
};

export default AddTaskForm;

