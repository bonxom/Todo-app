import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("workspace");

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
        getApiErrorMessage(error, t("failedToSaveProjectPleaseTryAgain")),
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="workspace-form flex flex-col gap-[20px] [&_label]:[font-weight:600] [&_label]:mb-[8px]
      [&_legend]:[font-weight:600] [&_legend]:mb-[8px] [&_.ui-input::placeholder]:opacity-[0.7]
      [@media(max-width:600px)]:gap-[17px]"
    >
      <div>
        <label
          htmlFor="project-name"
          className="mb-2 block text-sm font-medium text-[color:var(--color-text)]"
        >
          {t("projectName")}{" "}
          <span className="text-[color:var(--color-danger)]">*</span>
        </label>
        <input
          id="project-name"
          name="project_name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("eGWebsiteRefresh")}
          className="ui-input"
          required
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div
        className="workspace-project-preview flex items-center gap-[10px] p-[12px_14px] [background:var(--color-accent-soft)]
        rounded-[9px] text-[12px] [&_i]:w-[10px] [&_i]:h-[10px] [&_i]:[border:1px_solid_var(--color-line)]
        [&_i]:rounded-[3px] [&_i]:shrink-0 [&_span]:wrap-anywhere"
      >
        <i style={{ background: color }} />
        <span>{name.trim() || "Your project"}</span>
      </div>
      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-[color:var(--color-text)]">
          {t("projectColor")}
        </legend>
        <div
          className="workspace-color-options flex flex-wrap gap-[10px] p-[14px] [background:var(--color-surface-muted)]
            rounded-[10px] [border:1px_solid_var(--color-line)] [&_button]:w-[24px] [&_button]:h-[24px]
            [&_button]:shrink-0"
          role="radiogroup"
          aria-label={t("projectColor")}
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
                aria-label={t("messages.selectV0AsProjectColor", {
                  v0: swatch,
                })}
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
                <span className="sr-only">
                  {isSelected ? t("selected") : ""}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label
            htmlFor="project-custom-color"
            className="text-sm font-medium text-[color:var(--color-text)]"
          >
            {t("custom")}
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
          <span className="ui-chip inline-flex items-center gap-[0.375rem] [line-height:1.1] whitespace-nowrap ui-tabular [font-family:var(--font-mono)] [font-variant-numeric:tabular-nums]">
            {color}
          </span>
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="project-description"
          className="mb-2 block text-sm font-medium text-[color:var(--color-text)]"
        >
          {t("description")}
        </label>
        <textarea
          id="project-description"
          name="project_description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("describeWhatThisProjectIsFor")}
          rows={3}
          className="ui-input"
          autoComplete="off"
        />
      </div>

      {submitError && (
        <p
          className="workspace-form-error text-[var(--color-danger)] [background:var(--color-danger-soft)] rounded-[9px] p-[11px_13px] text-[12px] [line-height:1.6]"
          role="alert"
        >
          {submitError}
        </p>
      )}
      <div
        className="workspace-form-actions flex justify-end items-center gap-[10px] m-[4px_-28px_0]
        [background:var(--color-surface)] [border-top:1px_solid_var(--color-line)] sticky bottom-[0] z-1
        [&_button]:flex-[initial] [&_button]:rounded-[9px] [&_button]:min-h-[40px]
        [&_button[type=submit]]:min-w-[120px] [@media(max-width:600px)]:mx-[-20px]"
      >
        <button
          type="button"
          onClick={() => {
            handleReset();
            onClose();
          }}
          className="ui-btn-secondary"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="ui-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? projectId
              ? t("saving")
              : t("adding")
            : projectId
              ? t("saveProject")
              : t("addProject")}
        </button>
      </div>
    </form>
  );
};

export default AddProjectForm;
