import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import AddCategoryForm from './AddCategoryForm';
import AddProjectForm from './AddProjectForm';
import { taskService, categoryService, projectService } from '../../../api/apiService';
import { toMidnightDateTimeLocalValue, toISOStringLocal } from '../../../utils/dateTime';
import DateTimeInput from '../../../component/DateTimeInput';

const AddTaskForm = ({
  onClose,
  onTaskCreated,
  onProjectCreated,
  initialDueDate = '',
  initialProjectId = '',
}) => {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState(initialProjectId);
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState(initialDueDate || toMidnightDateTimeLocalValue());
  const [description, setDescription] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);

  const fetchCategories = useCallback(async (selectCategoryId) => {
    try {
      const response = await categoryService.getAllCategories();
      const categoriesData = Array.isArray(response) ? response : response.categories;
      if (categoriesData && categoriesData.length > 0) {
        setCategories(categoriesData);
        setCategoryId((currentCategoryId) => (
          selectCategoryId || currentCategoryId || categoriesData[0]?._id || ''
        ));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  const fetchProjects = useCallback(async (selectProjectId) => {
    try {
      const projectsData = await projectService.getAllProjects();
      setProjects(projectsData);

      if (selectProjectId) {
        setProjectId(selectProjectId);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchProjects();
  }, [fetchCategories, fetchProjects]);

  useEffect(() => {
    setProjectId(initialProjectId);
  }, [initialProjectId]);

  const handleReset = () => {
    setTitle('');
    setCategoryId(categories[0]?._id || '');
    setProjectId(initialProjectId);
    setPriority('Medium');
    setDueDate(toMidnightDateTimeLocalValue());
    setDescription('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      const newTask = {
        title,
        categoryId,
        projectId: projectId || undefined,
        priority,
        status: 'in-progress',
        dueDate: toISOStringLocal(dueDate),
        description,
      };
      
      await taskService.createTask(newTask);
      
      if (onTaskCreated) {
        onTaskCreated();
      }
      
      handleReset();
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
            Task Title <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title…"
            className="ui-input"
            required
            autoFocus
          />
      </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
              Category
            </label>
            <select
              id="category"
              value={categoryId}
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
            <label htmlFor="project" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
              Project
            </label>
            <select
              id="project"
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
              {projects.map((project) => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
              <option value="__add_project__">+ Add project</option>
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
              Priority
            </label>
            <select
              id="priority"
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

        <div>
          <label htmlFor="dueDate" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
            Due Date <span className="text-[var(--color-danger)]">*</span>
          </label>
          <DateTimeInput
            id="dueDate"
            value={dueDate}
            onChange={(val) => setDueDate(val)}
            className="ui-input"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
            Description
          </label>
          <textarea
            id="description"
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
            {isSubmitting ? 'Adding…' : 'Add Task'}
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
            aria-labelledby="inline-add-category-title"
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <h2 id="inline-add-category-title" className="text-xl font-semibold text-[var(--color-text)]">Add Category</h2>
              <button type="button" onClick={() => setShowAddCategory(false)} className="ui-modal-close-button" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ui-modal-body">
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
            aria-labelledby="inline-add-project-title"
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <h2 id="inline-add-project-title" className="text-xl font-semibold text-[var(--color-text)]">Add Project</h2>
              <button type="button" onClick={() => setShowAddProject(false)} className="ui-modal-close-button" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ui-modal-body">
              <AddProjectForm
                onClose={() => setShowAddProject(false)}
                onProjectCreated={(newProject) => {
                  fetchProjects(newProject?._id);
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

export default AddTaskForm;
