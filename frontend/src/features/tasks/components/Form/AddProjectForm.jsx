import { useState } from "react";
import {
  useCreateProjectMutation,
  useUpdateProjectMutation,
} from "../../api/projectMutations";
import { getProjectColor } from "@/shared/utils/projectColor";
import { getApiErrorMessage } from "@/shared/services/apiError";

const PROJECT_COLOR_SWATCHES = [
  "#456B8C",
  "#6C8060",
  "#BB8A60",
  "#8C81A5",
  "#B25547",
  "#2F7D5A",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#64748B",
  "#FFFFFF",
];

const AddProjectForm = ({
  onClose,
  onProjectCreated,
  onProjectSaved,
  project = null,
}) => {
  const projectId = project?._id;
  const projectName = project?.name || "";
  const projectDescription = project?.description || "";
  const projectColor = getProjectColor(project);
  const [name, setName] = useState(projectName);
  const [submitError, setSubmitError] = useState("");
  const [description, setDescription] = useState(projectDescription);
  const [color, setColor] = useState(projectColor);

  const createProjectMutation = useCreateProjectMutation();
  const updateProjectMutation = useUpdateProjectMutation();
  const isSubmitting =
    createProjectMutation.isPending || updateProjectMutation.isPending;

  const handleReset = () => {
    setName(projectName);
    setDescription(projectDescription);
    setColor(projectColor);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    try {
      const payload = {
        name,
        description,
        color,
      };

      const savedProject = projectId
        ? await updateProjectMutation.mutateAsync({ projectId, payload })
        : await createProjectMutation.mutateAsync(payload);

      onProjectCreated?.(savedProject);
      onProjectSaved?.(savedProject);

      handleReset();
      onClose();
    } catch (error) {
      console.error("Failed to create project:", error);
      setSubmitError(
        getApiErrorMessage(error, "Failed to save project. Please try again."),
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="workspace-form">
      <div>
        <label
          htmlFor="project-name"
          className="mb-2 block text-sm font-medium text-[color:var(--color-text)]"
        >
          Project Name{" "}
          <span className="text-[color:var(--color-danger)]">*</span>
        </label>
        <input
          id="project-name"
          name="project_name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Website refresh"
          className="ui-input"
          required
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="workspace-project-preview">
        <i style={{ background: color }} />
        <span>{name.trim() || "Your project"}</span>
      </div>
      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">
          Project Color
        </legend>
        <div
          className="workspace-color-options"
          role="radiogroup"
          aria-label="Project color"
          onKeyDown={(event) => {
            const buttons = [
              ...event.currentTarget.querySelectorAll('[role="radio"]'),
            ];
            const index = buttons.indexOf(document.activeElement);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : ["ArrowRight", "ArrowDown"].includes(event.key)
                    ? (index + 1) % buttons.length
                    : ["ArrowLeft", "ArrowUp"].includes(event.key)
                      ? (index - 1 + buttons.length) % buttons.length
                      : null;
            if (next === null) return;
            event.preventDefault();
            setColor(PROJECT_COLOR_SWATCHES[next]);
            buttons[next].focus();
          }}
        >
          {PROJECT_COLOR_SWATCHES.map((swatch) => {
            const isSelected = color.toUpperCase() === swatch;
            const isLight =
              swatch === "#FFFFFF" ||
              swatch === "#FEF3C7" ||
              swatch === "#E5E7EB";

            return (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={
                  isSelected ||
                  (!PROJECT_COLOR_SWATCHES.includes(color.toUpperCase()) &&
                    swatch === PROJECT_COLOR_SWATCHES[0])
                    ? 0
                    : -1
                }
                aria-label={`Select ${swatch} as project color`}
                onClick={() => setColor(swatch)}
                className="ui-focus-ring flex h-7 w-7 items-center justify-center rounded-full transition-[transform,box-shadow] duration-150 hover:scale-110"
                style={{
                  backgroundColor: swatch,
                  border: isLight
                    ? "1px solid var(--color-line)"
                    : "1px solid transparent",
                  boxShadow: isSelected
                    ? "0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent)"
                    : "none",
                }}
              >
                <span className="sr-only">{isSelected ? "Selected" : ""}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label
            htmlFor="project-custom-color"
            className="text-sm font-medium text-[color:var(--color-text)]"
          >
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
        <label
          htmlFor="project-description"
          className="mb-2 block text-sm font-medium text-[color:var(--color-text)]"
        >
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
          {isSubmitting
            ? projectId
              ? "Saving…"
              : "Adding…"
            : projectId
              ? "Save Project"
              : "Add Project"}
        </button>
      </div>
    </form>
  );
};

export default AddProjectForm;
