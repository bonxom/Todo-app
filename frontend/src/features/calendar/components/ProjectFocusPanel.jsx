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
      className="project-filter-panel"
      aria-label="Project filters"
    >
      <header className="project-filter-header">
        <p className="calendar-eyebrow">FOCUS YOUR CALENDAR</p>
        <div>
          <h3>
            <FolderKanban size={18} aria-hidden="true" /> Projects{" "}
            <span>{projects.length}</span>
          </h3>
          <button
            type="button"
            onClick={onAddProject}
            className="project-filter-add"
            aria-label="Add Project"
          >
            <Plus size={16} /> New
          </button>
        </div>
        <p>Choose the projects you want to see.</p>
      </header>
      <div className="project-filter-search">
        <Search size={16} aria-hidden="true" />
        <input
          aria-label="Search projects"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Find a project…"
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Clear project search"
            onClick={() => setSearchQuery("")}
          >
            <X size={14} />
          </button>
        )}
      </div>
      <button
        type="button"
        className="project-filter-all"
        aria-pressed={selected.size === 0}
        onClick={onClearProjects}
      >
        <Layers size={17} aria-hidden="true" />
        <span>
          All tasks<small>Every project & personal task</small>
        </span>
        <span className="project-filter-check" aria-hidden="true">
          {selected.size === 0 && <Check size={12} />}
        </span>
      </button>
      <div className="project-filter-list-heading">
        <span>
          {selected.size ? `${selected.size} selected` : "YOUR PROJECTS"}
        </span>
        {selected.size > 0 && (
          <button type="button" onClick={onClearProjects}>
            Clear
          </button>
        )}
      </div>
      <div className="project-filter-list">
        {filteredProjects.map((project) => {
          const isSelected = selected.has(project._id);
          const completed = isCompletedProject(project);
          return (
            <article
              key={project._id}
              className="project-filter-item"
              data-selected={isSelected}
            >
              <button
                type="button"
                className="project-filter-select"
                onClick={() => onToggleProject(project._id)}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? "Remove" : "Add"} ${project.name} ${isSelected ? "from" : "to"} project filters`}
              >
                <i style={{ background: getProjectColor(project) }} />
                <span className="project-filter-name">
                  {project.name}
                  <small>
                    {project.description ||
                      (completed ? "Completed project" : "Active project")}
                  </small>
                </span>
                <span className="project-filter-check" aria-hidden="true">
                  {isSelected && <Check size={12} />}
                </span>
              </button>
              <div className="project-filter-item-footer">
                <span>
                  {project.scheduledCount || 0} in view <b>·</b>{" "}
                  {project.selectedDayCount || 0} this day
                </span>
                <div>
                  {!completed && project.canComplete && (
                    <button
                      type="button"
                      onClick={() => onCompleteProject?.(project._id)}
                      aria-label={`Complete and hide ${project.name}`}
                      title="Complete project"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  {completed && (
                    <button
                      type="button"
                      onClick={() => onRestoreProject?.(project._id)}
                      aria-label={`Restore ${project.name}`}
                      title="Restore project"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingProject(project)}
                    aria-label={`Edit ${project.name}`}
                    title="Edit project"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {filteredProjects.length === 0 && (
          <div className="project-filter-empty">
            <Search size={22} />
            <strong>
              {projects.length
                ? "No matching projects"
                : "No projects available"}
            </strong>
            <p>
              {projects.length
                ? "Try another name or clear your search."
                : "Create a project to bring related tasks together."}
            </p>
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={
                projects.length ? () => setSearchQuery("") : onAddProject
              }
            >
              {projects.length ? "Clear search" : "Create a project"}
            </button>
          </div>
        )}
      </div>
      <footer className="project-filter-footer">
        <label>
          <input
            type="checkbox"
            checked={showCompletedProjects}
            onChange={(event) =>
              onShowCompletedProjectsChange?.(event.target.checked)
            }
          />{" "}
          Show Completed Projects
        </label>
      </footer>
      {editingProject && (
        <FormDialog
          title="Edit Project"
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
