import { useEffect, useState } from 'react';
import { projectService } from '../../../api/apiService';

const AddProjectForm = ({ onClose, onProjectCreated, onProjectSaved, project = null }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(project?.name || '');
    setDescription(project?.description || '');
  }, [project?._id, project?.name, project?.description]);

  const handleReset = () => {
    setName(project?.name || '');
    setDescription(project?.description || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const payload = {
        name,
        description,
      };

      const savedProject = project?._id
        ? await projectService.updateProject(project._id, payload)
        : await projectService.createProject(payload);

      onProjectCreated?.(savedProject);
      onProjectSaved?.(savedProject);

      handleReset();
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert(error.response?.data?.message || error.message || 'Failed to save project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-2">
          Project Name <span className="text-red-500">*</span>
        </label>
        <input
          id="project-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter project name..."
          className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition hover:border-gray-300 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/60"
          required
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project for?"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition hover:border-gray-300 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/60 resize-none"
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
          className="flex-1 h-11 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white font-medium rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (project?._id ? 'Saving...' : 'Adding...') : (project?._id ? 'Save Project' : 'Add Project')}
        </button>
      </div>
    </form>
  );
};

export default AddProjectForm;
