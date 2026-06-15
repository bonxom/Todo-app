import { useMemo, useState } from 'react';
import { FolderKanban, Plus, Search, X } from 'lucide-react';

const ProjectFocusPanel = ({
  projects,
  selectedProjectIds,
  onToggleProject,
  onClearProjects,
  onAddProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
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

            return (
              <button
                key={project._id}
                type="button"
                onClick={() => onToggleProject(project._id)}
                className="ui-focus-ring w-full rounded-[14px] border px-4 py-3 text-left transition-[background-color,border-color,box-shadow] duration-150"
                style={{
                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-line)',
                  background: isSelected ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                  boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
                }}
                aria-pressed={isSelected}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-text)]">{project.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {project.description || 'No project description yet.'}
                    </p>
                  </div>
                  <span
                    className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border text-xs font-bold"
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

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                  <span className="ui-tabular">{scheduledCount} scheduled</span>
                  <span className="ui-tabular">{selectedDayCount} on selected day</span>
                </div>
              </button>
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
