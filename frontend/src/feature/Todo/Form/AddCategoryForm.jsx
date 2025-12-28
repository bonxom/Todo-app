import { useState } from 'react';

const AddCategoryForm = ({ onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleReset = () => {
    setName('');
    setDescription('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Handle form submission
    console.log({ name, description });
    handleReset();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 mb-2">
          Category Name <span className="text-red-500">*</span>
        </label>
        <input
          id="category-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter category name..."
          className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition hover:border-gray-300 focus:border-purple-300 focus:ring-4 focus:ring-purple-200/60"
          required
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="category-description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="category-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter category description..."
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
          className="flex-1 h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-md transition-all"
        >
          Add Category
        </button>
      </div>
    </form>
  );
};

export default AddCategoryForm;
