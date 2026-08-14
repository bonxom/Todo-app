import { useMemo, useState } from 'react';
import { Check, FolderKanban, Pencil, Plus, RotateCcw, X } from 'lucide-react';
import AddProjectForm from '@/features/tasks/components/Form/AddProjectForm';
import { getProjectColor } from '@/shared/utils/projectColor';
import { isCompletedProject } from '@/shared/utils/projectStatus';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const selectedProjectSet = useMemo(() => new Set(selectedProjectIds), [selectedProjectIds]);
  const hasProjectFilter = selectedProjectIds.length > 0;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const selectedProjects = useMemo(
    () => projects.filter((project) => selectedProjectSet.has(project._id)),
    [projects, selectedProjectSet]
  );
  const filteredProjects = useMemo(() => {
    if (!normalizedSearchQuery) {
      return projects;
    }

    return projects.filter((project) => {
      const name = project.name?.toLowerCase() || '';
      const description = project.description?.toLowerCase() || '';
      return name.includes(normalizedSearchQuery) || description.includes(normalizedSearchQuery);
    });
  }, [normalizedSearchQuery, projects]);

  return (
    <aside className="ui-section-card flex h-full flex-col overflow-hidden">
      {editingProject ? (
        <div
          className="ui-modal-overlay fixed inset-0 z-[80] flex items-center justify-center p-4"
          onClick={() => setEditingProject(null)}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-lg animate-fadeIn"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-project-${editingProject._id}`}
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <div>
                <p className="ui-page-kicker">Edit</p>
                <h2 id={`edit-project-${editingProject._id}`} className="text-xl font-semibold text-[var(--color-text)]">
                  Edit Project
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="ui-modal-close-button"
                aria-label="Close edit project dialog"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="ui-modal-body">
              <AddProjectForm
                project={editingProject}
                onClose={() => setEditingProject(null)}
                onProjectSaved={() => {
                  setEditingProject(null);
                  onProjectUpdated?.();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-b border-[var(--color-line)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
              <p className="text-sm font-semibold text-[var(--color-text)]">Project filters</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onAddProject}
            className="ui-btn-tertiary ui-focus-ring shrink-0 px-3"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Project
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={showCompletedProjects}
              onChange={(event) => onShowCompletedProjectsChange?.(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-[var(--color-line)] accent-[var(--color-accent)]"
            />
            Show Completed Projects
          </label>
          <span className="ui-chip ui-tabular">
            {hasProjectFilter ? `${selectedProjectIds.length} selected` : 'All tasks'}
          </span>
          <button
            type="button"
            onClick={onClearProjects}
            className="ui-btn-tertiary ui-focus-ring px-3"
          >
            Clear
          </button>
        </div>

        {hasProjectFilter ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedProjects.map((project) => (
              <span
                key={`selected-${project._id}`}
                className="ui-chip max-w-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
              >
                <span className="truncate">{project.name}</span>
                <button
                  type="button"
                  onClick={() => onToggleProject(project._id)}
                  className="ui-focus-ring inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-accent)] transition-[background-color,color] duration-150 hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                  aria-label={`Remove ${project.name} from project filters`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
        <label className="relative mb-4 block">
          <span className="sr-only">Search projects</span>
          <input
            type="search"
            name="projectSearch"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search Projects…"
            className="ui-input pl-10"
            autoComplete="off"
          />
        </label>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredProjects.length > 0 ? filteredProjects.map((project) => {
            const isSelected = selectedProjectSet.has(project._id);
            const scheduledCount = project.scheduledCount || 0;
            const selectedDayCount = project.selectedDayCount || 0;
            const projectColor = getProjectColor(project);
            const isCompleted = isCompletedProject(project);

            return (
              <article
                key={project._id}
                className={`relative overflow-hidden rounded-[14px] border text-left transition-[background-color,border-color,box-shadow,opacity] duration-150 ${
                  isCompleted ? 'opacity-75' : ''
                }`}
                style={{
                  borderTopColor: isSelected ? 'var(--color-accent)' : 'var(--color-line)',
                  borderRightColor: isSelected ? 'var(--color-accent)' : 'var(--color-line)',
                  borderBottomColor: isSelected ? 'var(--color-accent)' : 'var(--color-line)',
                  background: isSelected ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                  boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
                  borderLeftColor: projectColor,
                  borderLeftWidth: '5px',
                }}
              >
                <button
                  type="button"
                  onClick={() => onToggleProject(project._id)}
                  className="ui-focus-ring absolute inset-0 rounded-[10px] transition-[background-color] duration-150 hover:bg-[var(--color-surface-muted)]"
                  aria-label={`${isSelected ? 'Remove' : 'Add'} ${project.name} ${isSelected ? 'from' : 'to'} project filters`}
                  aria-pressed={isSelected}
                />
                <div className="pointer-events-none relative flex items-start justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">{project.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-muted)]">
                      {project.description || 'No project description yet.'}
                    </p>
                  </div>
                  <div className="pointer-events-auto flex items-center gap-2">
                    {!isCompleted && project.canComplete ? (
                      <button
                        type="button"
                        onClick={() => onCompleteProject?.(project._id)}
                        className="ui-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)] transition-[background-color,border-color,color] duration-150 hover:bg-[var(--color-success)] hover:text-white"
                        aria-label={`Complete and hide ${project.name}`}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ) : null}
                    {isCompleted ? (
                      <button
                        type="button"
                        onClick={() => onRestoreProject?.(project._id)}
                        className="ui-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-[background-color,border-color,color] duration-150 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                        aria-label={`Restore ${project.name}`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setEditingProject(project)}
                      className="ui-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-[background-color,border-color,color] duration-150 hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                      aria-label={`Edit ${project.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-md border text-xs font-bold"
                      style={{
                        borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-line)',
                        background: isSelected ? 'var(--color-accent)' : 'var(--color-surface)',
                        color: isSelected ? '#ffffff' : 'transparent',
                      }}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  </div>
                </div>

                <div className="pointer-events-none relative mt-2 flex flex-wrap gap-3 px-4 pb-2 text-xs text-[var(--color-text-muted)]">
                  <span className="ui-tabular">{scheduledCount} scheduled</span>
                  <span className="ui-tabular">{selectedDayCount} on selected day</span>
                </div>
              </article>
            );
          }) : (
            <div className="rounded-[14px] border border-dashed border-[var(--color-line)] bg-[var(--color-surface-muted)] px-4 py-8 text-center">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                  {projects.length > 0 ? 'No matching projects' : 'No projects available'}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {projects.length > 0
                  ? 'Try a different project name or description.'
                  : 'Create a project first, then return here to filter by it.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default ProjectFocusPanel;
