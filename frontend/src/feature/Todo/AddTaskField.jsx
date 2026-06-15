import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
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
    <div className="ui-section-card ui-card-padding">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new task…"
            className="ui-input flex-1"
            aria-label="Task title"
          />
          <button
            type="submit"
            className="ui-btn-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add</span>
          </button>
        </div>
        
        <div className="flex gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="ui-input"
            aria-label="Category"
          >
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="ui-input"
            aria-label="Priority"
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
