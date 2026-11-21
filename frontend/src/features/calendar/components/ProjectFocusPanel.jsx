import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  Check,
  FolderKanban,
  Search,
  Pencil,
  Plus,
  RotateCcw,
  X,
  Layers,
} from "lucide-react";
import AddProjectForm from "@/features/tasks/components/Form/AddProjectForm";
import FormDialog from "@/shared/components/FormDialog";
import { getProjectColor } from "@/shared/utils/projectColor";
import { isCompletedProject } from "@/shared/utils/projectStatus";

const ProjectFocusPanel = ({
  projects,
  selectedProjectIds,
  onToggleProject,
  onClearProjects,
  onAddProject,
  onProjectUpdated,
  showCompletedProjects,
  onShowCompletedProjectsChange,
  onCompleteProject,
  onRestoreProject,
}) => {
  const { t } = useTranslation("workspace");

  const [searchQuery, setSearchQuery] = useState("");
  const [editingProject, setEditingProject] = useState(null);
  const selected = useMemo(
    () => new Set(selectedProjectIds),
    [selectedProjectIds],
  );
  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        `${project.name || ""} ${project.description || ""}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase()),
      ),
    [projects, searchQuery],
  );
  return (
    <aside
      id="calendar-project-filters"
      className="project-filter-panel [background:var(--color-surface)] [border:1px_solid_var(--color-line)] rounded-[14px] overflow-hidden"
      aria-label={t("projectFilters")}
    >
      <header
        className="project-filter-header p-[22px_20px_16px] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:justify-between
        [&_>_div]:gap-[8px] [&_>_div]:m-[10px_0] [&_h3]:flex [&_h3]:items-center [&_h3]:gap-[8px] [&_h3]:text-[18px]
        [&_h3]:[font-weight:600] [&_h3]:[letter-spacing:-0.025em] [&_h3_svg]:text-[var(--color-accent)]
        [&_h3_span]:text-[10px] [&_h3_span]:rounded-[5px] [&_h3_span]:p-[2px_6px]
        [&_h3_span]:[background:var(--color-surface-muted)] [&_h3_span]:text-[var(--color-text-muted)]
        [&_>_p:last-child]:text-[11px] [&_>_p:last-child]:text-[var(--color-text-muted)]"
      >
        <p className="calendar-eyebrow text-[10px] [letter-spacing:0.13em] [font-weight:700] text-[var(--color-accent)]">
          {t("focusYourCalendar")}
        </p>
        <div>
          <h3>
            <FolderKanban size={18} aria-hidden="true" /> {t("projects")}{" "}
            <span>{projects.length}</span>
          </h3>
          <button
            type="button"
            onClick={onAddProject}
            className="project-filter-add flex items-center gap-[4px] p-[6px_8px] rounded-[6px] cursor-pointer [&:hover]:[background:var(--color-accent-soft)]"
            aria-label={t("addProject")}
          >
            <Plus size={16} /> {t("new")}
          </button>
        </div>
        <p>{t("chooseTheProjectsYouWantToSee")}</p>
      </header>
      <div
        className="project-filter-search flex items-center gap-[8px] m-[0_16px_16px] p-[10px]
        [border:1px_solid_var(--color-line)] rounded-[8px] text-[var(--color-text-muted)]
        [&:focus-within]:[outline:2px_solid_var(--ring-focus-outline)] [&:focus-within]:outline-offset-[2px]
        [&_input[type=search]]:min-w-[0] [&_input[type=search]]:w-full [&_input[type=search]]:p-[0]
        [&_input[type=search]]:[background:transparent] [&_input[type=search]]:[outline:none] [&_button]:grid
        [&_button]:place-items-center [&_button]:cursor-pointer"
      >
        <Search size={16} aria-hidden="true" />
        <input
          aria-label={t("searchProjects")}
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t("findAProject")}
        />
        {searchQuery && (
          <button
            type="button"
            aria-label={t("clearProjectSearch")}
            onClick={() => setSearchQuery("")}
          >
            <X size={14} />
          </button>
        )}
      </div>
      <button
        type="button"
        className="project-filter-all flex items-center gap-[10px] w-[calc(100%_-_32px)] m-[0_16px] p-[12px]
          [border:1px_solid_transparent] rounded-[9px] text-left cursor-pointer [&_>_svg]:text-[var(--color-accent)]
          [&_>_svg]:shrink-0 [&_>_span:nth-child(2)]:flex-1 [&_>_span:nth-child(2)]:text-[12px]
          [&_>_span:nth-child(2)]:[font-weight:600] [&_small]:block [&_small]:text-[10px] [&_small]:[font-weight:400]
          [&_small]:text-[var(--color-text-muted)] [&_small]:mt-[3px]
          [&[aria-pressed=true]]:[background:var(--color-accent-soft)]
          [&[aria-pressed=true]]:border-[color-mix(in_srgb,var(--color-accent)_22%,var(--color-line))]"
        aria-pressed={selected.size === 0}
        onClick={onClearProjects}
      >
        <Layers size={17} aria-hidden="true" />
        <span>
          {t("allTasks")}
          <small>{t("everyProjectPersonalTask")}</small>
        </span>
        <span
          className="project-filter-check grid place-items-center w-[16px] h-[16px] rounded-[4px] shrink-0"
          aria-hidden="true"
        >
          {selected.size === 0 && <Check size={12} />}
        </span>
      </button>
      <div
        className="project-filter-list-heading flex items-center justify-between min-h-[44px] p-[14px_20px_10px] text-[9px]
        [letter-spacing:0.08em] text-[var(--color-text-muted)] [&_button]:[letter-spacing:0] [&_button]:cursor-pointer"
      >
        <span>
          {selected.size
            ? t("messages.v0Selected", { v0: selected.size })
            : t("yourProjects")}
        </span>
        {selected.size > 0 && (
          <button type="button" onClick={onClearProjects}>
            {t("clear")}
          </button>
        )}
      </div>
      <div className="project-filter-list p-[0_12px_12px] flex flex-col gap-[5px] max-h-[420px] overflow-y-auto">
        {filteredProjects.map((project) => {
          const isSelected = selected.has(project._id);
          const completed = isCompletedProject(project);
          return (
            <article
              key={project._id}
              className="project-filter-item [border:1px_solid_transparent] rounded-[9px] [&[data-selected=true]]:border-[var(--color-line)]"
              data-selected={isSelected}
            >
              <button
                type="button"
                className="project-filter-select w-full flex items-start gap-[9px] text-left p-[12px_8px_5px] rounded-[8px]
                  cursor-pointer [&_>_i]:h-[9px] [&_>_i]:w-[9px]
                  [&_>_i]:[border:1px_solid_color-mix(in_srgb,var(--color-text)_12%,transparent)] [&_>_i]:rounded-[3px]
                  [&_>_i]:shrink-0 [&_>_i]:mt-[5px]"
                onClick={() => onToggleProject(project._id)}
                aria-pressed={isSelected}
                aria-label={t("messages.v0V1V2ProjectFilters", {
                  v0: isSelected ? t("remove") : t("add"),
                  v1: project.name,
                  v2: isSelected ? "from" : "to",
                })}
              >
                <i style={{ background: getProjectColor(project) }} />
                <span
                  className="project-filter-name min-w-[0] flex-1 text-[13px] [font-weight:550] wrap-anywhere [&_small]:block
                  [&_small]:text-[11px] [&_small]:[font-weight:400] [&_small]:text-[var(--color-text-muted)] [&_small]:mt-[4px]
                  [&_small]:[line-height:1.6]"
                >
                  {project.name}
                  <small>
                    {project.description ||
                      (completed ? t("completedProject") : t("activeProject"))}
                  </small>
                </span>
                <span
                  className="project-filter-check grid place-items-center w-[16px] h-[16px] rounded-[4px] shrink-0"
                  aria-hidden="true"
                >
                  {isSelected && <Check size={12} />}
                </span>
              </button>
              <div
                className="project-filter-item-footer flex items-center justify-between gap-[6px] p-[0_8px_8px_26px] text-[9px]
                text-[var(--color-text-muted)] [&_b]:[font-weight:400] [&_b]:px-[3px] [&_>_div]:flex [&_button]:grid
                [&_button]:place-items-center [&_button]:w-[27px] [&_button]:h-[27px] [&_button]:rounded-[5px]
                [&_button]:cursor-pointer [&_button:hover]:[background:var(--color-surface)]"
              >
                <span>
                  {project.scheduledCount || 0} {t("inView")} <b>·</b>{" "}
                  {project.selectedDayCount || 0} {t("thisDay")}{" "}
                </span>
                <div>
                  {!completed && project.canComplete && (
                    <button
                      type="button"
                      onClick={() => onCompleteProject?.(project._id)}
                      aria-label={t("messages.completeAndHideV0", {
                        v0: project.name,
                      })}
                      title={t("completeProject")}
                    >
                      <Check size={14} />
                    </button>
                  )}
                  {completed && (
                    <button
                      type="button"
                      onClick={() => onRestoreProject?.(project._id)}
                      aria-label={t("messages.restoreV0", { v0: project.name })}
                      title={t("restoreProject")}
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingProject(project)}
                    aria-label={t("messages.editV0", { v0: project.name })}
                    title={t("editProject")}
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {filteredProjects.length === 0 && (
          <div
            className="project-filter-empty text-center p-[24px_12px] text-[var(--color-text-muted)] text-[11px]
            [&_>_svg]:m-[0_auto_12px] [&_strong]:block [&_strong]:text-[13px] [&_strong]:text-[var(--color-text)]
            [&_p]:m-[8px_0_16px] [&_button]:min-h-[32px]"
          >
            <Search size={22} />
            <strong>
              {projects.length
                ? t("noMatchingProjects")
                : t("noProjectsAvailable")}
            </strong>
            <p>
              {projects.length
                ? t("tryAnotherNameOrClearYourSearch")
                : t("createAProjectToBringRelatedTasksTogether")}
            </p>
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={
                projects.length ? () => setSearchQuery("") : onAddProject
              }
            >
              {projects.length ? t("clearSearch") : t("createAProject")}
            </button>
          </div>
        )}
      </div>
      <footer
        className="project-filter-footer p-[14px_20px] [border-top:1px_solid_var(--color-line)]
        [background:var(--color-surface-muted)] [&_label]:flex [&_label]:items-center [&_label]:gap-[8px]
        [&_label]:text-[10px] [&_label]:text-[var(--color-text-muted)] [&_label]:cursor-pointer [&_input]:w-[14px]
        [&_input]:h-[14px]"
      >
        <label>
          <input
            type="checkbox"
            checked={showCompletedProjects}
            onChange={(event) =>
              onShowCompletedProjectsChange?.(event.target.checked)
            }
          />{" "}
          {t("showCompletedProjects")}
        </label>
      </footer>
      {editingProject && (
        <FormDialog
          title={t("editProject")}
          kind="project"
          onClose={() => setEditingProject(null)}
        >
          <AddProjectForm
            project={editingProject}
            onClose={() => setEditingProject(null)}
            onProjectSaved={() => {
              setEditingProject(null);
              onProjectUpdated?.();
            }}
          />
        </FormDialog>
      )}
    </aside>
  );
};
export default ProjectFocusPanel;
