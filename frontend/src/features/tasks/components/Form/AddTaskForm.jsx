import FormDialog from "@/shared/components/FormDialog";
import { useMemo, useState } from "react";
import AddCategoryForm from "./AddCategoryForm";
import AddProjectForm from "./AddProjectForm";
import { useCreateTaskMutation } from "../../api/taskMutations";
import { useCategoriesQuery } from "@/features/categories/api/categoryQueries";
import { useProjectsQuery } from "../../api/projectQueries";
import {
  toMidnightDateTimeLocalValue,
  toISOStringLocal,
} from "@/shared/utils/dateTime";
import DateTimeInput from "@/shared/components/DateTimeInput";
import { isActiveProject } from "@/shared/utils/projectStatus";
import { getApiErrorMessage } from "@/shared/services/apiError";

const AddTaskForm = ({
  onClose,
  onTaskCreated,
  onProjectCreated,
  initialDueDate = "",
  initialProjectId = "",
}) => {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId);
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState(
    initialDueDate || toMidnightDateTimeLocalValue(),
  );
  const [submitError, setSubmitError] = useState("");
  const [description, setDescription] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  const categoriesQuery = useCategoriesQuery();
  const projectsQuery = useProjectsQuery();
  const createTaskMutation = useCreateTaskMutation();

  const categories = useMemo(
    () => categoriesQuery.data || [],
    [categoriesQuery.data],
  );
  const projects = useMemo(
    () => projectsQuery.data || [],
    [projectsQuery.data],
  );
  const activeProjects = useMemo(
    () => projects.filter(isActiveProject),
    [projects],
  );
  const isSubmitting = createTaskMutation.isPending;

  const handleReset = () => {
    setTitle("");
    setCategoryId("");
    setProjectId(initialProjectId);
    setPriority("Medium");
    setDueDate(toMidnightDateTimeLocalValue());
    setDescription("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    try {
      const newTask = {
        title,
        categoryId: categoryId || categories[0]?._id || undefined,
        projectId: projectId || undefined,
        priority,
        status: "in-progress",
        dueDate: toISOStringLocal(dueDate),
        description,
      };

      await createTaskMutation.mutateAsync(newTask);

      if (onTaskCreated) {
        onTaskCreated();
      }

      handleReset();
      onClose();
    } catch (error) {
      console.error("Failed to create task:", error);
      setSubmitError(
        getApiErrorMessage(error, "Failed to create task. Please try again."),
      );
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="workspace-form">
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium text-[var(--color-text)]"
          >
            Task Title <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to get done?"
            className="ui-input"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="category"
              className="mb-2 block text-sm font-medium text-[var(--color-text)]"
            >
              Category
            </label>
            <select
              id="category"
              value={categoryId || categories[0]?._id || ""}
              onChange={(e) => {
                if (e.target.value === "__add_more__") {
                  setShowAddCategory(true);
                } else {
                  setCategoryId(e.target.value);
                }
              }}
              className="ui-input"
            >
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
              <option value="__add_more__">+ Add more</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="project"
              className="mb-2 block text-sm font-medium text-[var(--color-text)]"
            >
              Project
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => {
                if (e.target.value === "__add_project__") {
                  setShowAddProject(true);
                } else {
                  setProjectId(e.target.value);
                }
              }}
              className="ui-input"
            >
              <option value="">No project</option>
              {activeProjects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
              <option value="__add_project__">+ Add project</option>
            </select>
          </div>
        </div>
        <div className="workspace-form-schedule">
          <div>
            <label
              htmlFor="priority"
              className="mb-2 block text-sm font-medium text-[var(--color-text)]"
            >
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
          <div>
            <label
              htmlFor="dueDate"
              className="mb-2 block text-sm font-medium text-[var(--color-text)]"
            >
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
        </div>
        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium text-[var(--color-text)]"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a few details, links, or a helpful reminder…"
            rows={3}
            className="ui-input"
          />
        </div>

        {submitError && (
          <p className="workspace-form-error" role="alert">
            {submitError}
          </p>
        )}
        <div className="workspace-form-actions">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="ui-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="ui-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Adding…" : "Add Task"}
          </button>
        </div>
      </form>

      <FormDialog
        isOpen={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        title="Add Category"
        kind="category"
      >
        <AddCategoryForm
          onClose={() => setShowAddCategory(false)}
          onCategoryCreated={(newCategory) => {
            setCategoryId(newCategory?._id || newCategory?.category?._id || "");
          }}
        />
      </FormDialog>

      <FormDialog
        isOpen={showAddProject}
        onClose={() => setShowAddProject(false)}
        title="Add Project"
        kind="project"
      >
        <AddProjectForm
          onClose={() => setShowAddProject(false)}
          onProjectCreated={(newProject) => {
            setProjectId(newProject?._id || "");
            onProjectCreated?.(newProject);
          }}
        />
      </FormDialog>
    </>
  );
};

export default AddTaskForm;
