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
        <label htmlFor="project-name" className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">
          Project Name <span className="text-[color:var(--color-danger)]">*</span>
        </label>
        <input
          id="project-name"
          name="project_name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter project name…"
          className="ui-input"
          required
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div>
        <label htmlFor="project-description" className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">
          Description
        </label>
        <textarea
          id="project-description"
          name="project_description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this project is for…"
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
          {isSubmitting ? (project?._id ? 'Saving…' : 'Adding…') : (project?._id ? 'Save Project' : 'Add Project')}
        </button>
      </div>
    </form>
  );
};

export default AddProjectForm;
