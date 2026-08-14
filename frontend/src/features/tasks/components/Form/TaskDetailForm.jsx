import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import AddCategoryForm from './AddCategoryForm';
import AddProjectForm from './AddProjectForm';
import { useUpdateTaskMutation } from '../../api/taskMutations';
import { useCategoriesQuery } from '@/features/categories/api/categoryQueries';
import { useProjectsQuery } from '../../api/projectQueries';
import { toDateTimeLocalValue, toISOStringLocal } from '@/shared/utils/dateTime';
import DateTimeInput from '@/shared/components/DateTimeInput';
import { isActiveProject, isCompletedProject } from '@/shared/utils/projectStatus';
import { getApiErrorMessage } from '@/shared/services/apiError';

const STATUS_STYLES = {
  pending: 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-line)]',
  'in-progress': 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-[var(--color-accent-soft)]',
  completed: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-[var(--color-success-soft)]',
  'given-up': 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-line)]',
};

const STATUS_LABELS = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed',
  'given-up': 'Given Up',
};

const TaskDetailForm = ({ task, onClose, onTaskUpdated, onProjectCreated }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [categoryId, setCategoryId] = useState(task?.categoryId?._id || task?.categoryId || '');
  const [projectId, setProjectId] = useState(task?.projectId?._id || task?.projectId || '');
  const [priority, setPriority] = useState(task?.priority || 'Medium');
  const [startDate, setStartDate] = useState(toDateTimeLocalValue(task?.startDate || ''));
  const [dueDate, setDueDate] = useState(toDateTimeLocalValue(task?.dueDate || ''));
  const [description, setDescription] = useState(task?.description || '');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  const categoriesQuery = useCategoriesQuery();
  const projectsQuery = useProjectsQuery();
  const updateTaskMutation = useUpdateTaskMutation();

  const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);
  const projects = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);
  const activeProjects = useMemo(() => projects.filter(isActiveProject), [projects]);
  const taskProjectId = task?.projectId?._id || task?.projectId || '';
  const currentCompletedProject = useMemo(() => (
    projects.find((project) => project._id === taskProjectId && isCompletedProject(project)) || null
  ), [projects, taskProjectId]);

  const isSubmitting = updateTaskMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const updatedTask = {
        title,
        categoryId: categoryId || categories[0]?._id || undefined,
        projectId: projectId || null,
        priority,
        startDate: toISOStringLocal(startDate) || undefined,
        dueDate: toISOStringLocal(dueDate) || undefined,
        description,
      };
      
      await updateTaskMutation.mutateAsync({
        taskId: task._id || task.id,
        payload: updatedTask,
      });
      
      if (onTaskUpdated) {
        onTaskUpdated();
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert(getApiErrorMessage(error, 'Failed to update task. Please try again.'));
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-title" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
            Task Title <span className="text-[var(--color-danger)]">*</span>
          </label>
        <input
          id="edit-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title…"
          className="ui-input"
          required
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="edit-status" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
          Status
        </label>
        <div
          className={`flex h-11 items-center rounded-[var(--radius-md)] border px-4 text-sm font-medium ${STATUS_STYLES[task?.status] || STATUS_STYLES.pending}`}
        >
          {STATUS_LABELS[task?.status] || task?.status}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-category" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
            Category
          </label>
          <select
            id="edit-category"
            value={categoryId || categories[0]?._id || ''}
            onChange={(e) => {
              if (e.target.value === '__add_more__') {
                setShowAddCategory(true);
              } else {
                setCategoryId(e.target.value);
              }
            }}
            className="ui-input"
          >
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
            <option value="__add_more__">+ Add more</option>
          </select>
        </div>

        <div>
          <label htmlFor="edit-project" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
            Project
          </label>
          <select
            id="edit-project"
            value={projectId}
            onChange={(e) => {
              if (e.target.value === '__add_project__') {
                setShowAddProject(true);
              } else {
                setProjectId(e.target.value);
              }
            }}
            className="ui-input"
          >
            <option value="">No project</option>
            {currentCompletedProject ? (
              <option value={currentCompletedProject._id} disabled>
                {currentCompletedProject.name} (completed)
              </option>
            ) : null}
            {activeProjects.map((project) => (
              <option key={project._id} value={project._id}>{project.name}</option>
            ))}
            <option value="__add_project__">+ Add project</option>
          </select>
        </div>

        <div>
          <label htmlFor="edit-priority" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
            Priority
          </label>
          <select
            id="edit-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="ui-input"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-startDate" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
            Start Date
          </label>
          <DateTimeInput
            id="edit-startDate"
            value={startDate}
            onChange={(val) => setStartDate(val)}
            className="ui-input"
          />
        </div>

        <div>
          <label htmlFor="edit-dueDate" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
            Due Date <span className="text-[var(--color-danger)]">*</span>
          </label>
          <DateTimeInput
            id="edit-dueDate"
            value={dueDate}
            onChange={(val) => setDueDate(val)}
            className="ui-input"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="edit-description" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
          Description
        </label>
        <textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter task description…"
          rows={3}
          className="ui-input"
        />
      </div>

      <div className="flex gap-3 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="ui-btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="ui-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
      </form>

      {showAddCategory && (
        <div
          className="ui-modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowAddCategory(false)}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-md animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-inline-add-cat-title"
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <h2 id="edit-inline-add-cat-title" className="text-xl font-semibold text-[var(--color-text)]">Add Category</h2>
              <button type="button" onClick={() => setShowAddCategory(false)} className="ui-modal-close-button" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ui-modal-body">
              <AddCategoryForm 
                onClose={() => setShowAddCategory(false)}
                onCategoryCreated={(newCategory) => {
                  setCategoryId(newCategory?._id || newCategory?.category?._id || '');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showAddProject && (
        <div
          className="ui-modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowAddProject(false)}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-md animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-inline-add-proj-title"
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <h2 id="edit-inline-add-proj-title" className="text-xl font-semibold text-[var(--color-text)]">Add Project</h2>
              <button type="button" onClick={() => setShowAddProject(false)} className="ui-modal-close-button" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ui-modal-body">
              <AddProjectForm
                onClose={() => setShowAddProject(false)}
                onProjectCreated={(newProject) => {
                  setProjectId(newProject?._id || '');
                  onProjectCreated?.(newProject);
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
