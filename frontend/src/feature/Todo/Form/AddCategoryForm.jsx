import { useState } from 'react';
import { categoryService } from '../../../api/apiService';

const AddCategoryForm = ({ onClose, onCategoryCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = () => {
    setName('');
    setDescription('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      const newCategory = {
        name,
        description,
      };
      
      const response = await categoryService.createCategory(newCategory);
      
      if (onCategoryCreated) {
        onCategoryCreated(response);
      }
      
      handleReset();
      onClose();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert(error.response?.data?.message || 'Failed to create category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="category-name" className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">
          Category Name <span className="text-[color:var(--color-danger)]">*</span>
        </label>
        <input
          id="category-name"
          name="category_name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter category name…"
          className="ui-input"
          required
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div>
        <label htmlFor="category-description" className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">
          Description
        </label>
        <textarea
          id="category-description"
          name="category_description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what belongs in this category…"
          rows={3}
          className="ui-input"
          autoComplete="off"
        />
      </div>

      <div className="flex gap-3 pt-3">
        <button
          type="button"
          onClick={() => {
            handleReset();
            onClose();
          }}
          className="ui-btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="ui-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Adding…' : 'Add Category'}
        </button>
      </div>
    </form>
  );
};

export default AddCategoryForm;
