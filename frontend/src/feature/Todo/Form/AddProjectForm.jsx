import { useEffect, useState } from 'react';
import { projectService } from '../../../api/apiService';
import { DEFAULT_PROJECT_COLOR, getProjectColor } from '../../../utils/projectColor';

const PROJECT_COLOR_SWATCHES = [
  '#FFFFFF', '#FECACA', '#FED7AA', '#FEF3C7', '#D9F99D', '#BBF7D0',
  '#A7F3D0', '#A5F3FC', '#BAE6FD', '#BFDBFE', '#C7D2FE', '#DDD6FE',
  '#F5D0FE', '#FBCFE8', '#E5E7EB', '#FCA5A5', '#FB923C', '#FACC15',
  '#84CC16', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1',
  '#8B5CF6', '#D946EF', '#EC4899', '#64748B',
];

const AddProjectForm = ({ onClose, onProjectCreated, onProjectSaved, project = null }) => {
  const projectId = project?._id;
  const projectName = project?.name || '';
  const projectDescription = project?.description || '';
  const projectColor = getProjectColor(project);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(projectName);
    setDescription(projectDescription);
    setColor(projectColor);
  }, [projectColor, projectDescription, projectId, projectName]);

  const handleReset = () => {
    setName(projectName);
    setDescription(projectDescription);
    setColor(projectColor);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const payload = {
        name,
        description,
        color,
      };

      const savedProject = projectId
        ? await projectService.updateProject(projectId, payload)
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
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">
          Project Color
        </legend>
        <div
          className="grid grid-cols-7 gap-2 rounded-[14px] border border-[color:var(--color-line)] bg-[var(--color-surface-muted)] p-3 sm:grid-cols-9"
          role="radiogroup"
          aria-label="Project color"
        >
          {PROJECT_COLOR_SWATCHES.map((swatch) => {
            const isSelected = color === swatch;
            const isLight = swatch === '#FFFFFF' || swatch === '#FEF3C7' || swatch === '#E5E7EB';

            return (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`Select ${swatch} as project color`}
                onClick={() => setColor(swatch)}
                className="ui-focus-ring flex h-7 w-7 items-center justify-center rounded-full transition-[transform,box-shadow] duration-150 hover:scale-110"
                style={{
                  backgroundColor: swatch,
                  border: isLight ? '1px solid var(--color-line)' : '1px solid transparent',
                  boxShadow: isSelected
                    ? '0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent)'
                    : 'none',
                }}
              >
                <span className="sr-only">{isSelected ? 'Selected' : ''}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label htmlFor="project-custom-color" className="text-sm font-medium text-[color:var(--color-text)]">
            Custom
          </label>
          <input
            id="project-custom-color"
            name="project_color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value.toUpperCase())}
            className="h-9 w-12 cursor-pointer rounded-lg border border-[color:var(--color-line)] bg-[var(--color-surface)] p-1"
            autoComplete="off"
          />
          <span className="ui-chip ui-tabular">{color}</span>
        </div>
      </fieldset>

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
          {isSubmitting ? (projectId ? 'Saving…' : 'Adding…') : (projectId ? 'Save Project' : 'Add Project')}
        </button>
      </div>
    </form>
  );
};

export default AddProjectForm;
