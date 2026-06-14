import { useMemo, useState } from 'react';
import { FolderKanban, Layers3, Search, X } from 'lucide-react';

const ProjectFocusPanel = ({
  projects,
  selectedProjectIds,
  onToggleProject,
  onSelectAllProjects,
  onClearProjects,
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
    <aside className="flex h-full flex-col gap-5 rounded-[2rem] border border-gray-200 bg-white p-5 shadow-lg">
      <div className="rounded-[1.7rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-600">Project Filters</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">Choose workstreams</h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
            <FolderKanban className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClearProjects}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100"
          >
            Clear
          </button>
        </div>

        {hasProjectFilter ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedProjects.map((project) => (
              <span
                key={`selected-${project._id}`}
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm ring-1 ring-sky-100"
              >
                <span className="truncate">{project.name}</span>
                <button
                  type="button"
                  onClick={() => onToggleProject(project._id)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-sky-600 transition-colors hover:bg-sky-100 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  aria-label={`Remove ${project.name} from project filters`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-sky-600" />
              <p className="text-sm font-semibold text-gray-900">Projects</p>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
              {hasProjectFilter ? `${selectedProjectIds.length} selected` : 'All tasks'}
            </span>
          </div>

          <label className="relative mb-3 block">
            <span className="sr-only">Search projects</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Projects…"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-slate-300 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
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
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-all focus:outline-none focus:ring-4 focus:ring-sky-100 ${
                    isSelected
                      ? 'border-sky-300 bg-sky-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-sky-200 hover:bg-sky-50/60'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{project.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {project.description || 'No project description yet.'}
                      </p>
                    </div>
                    <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border text-xs font-bold ${
                      isSelected
                        ? 'border-sky-500 bg-sky-500 text-white'
                        : 'border-gray-300 bg-white text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-gray-700 shadow-sm">
                      {scheduledCount} scheduled
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-sky-700 shadow-sm">
                      {selectedDayCount} on selected day
                    </span>
                  </div>
                </button>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-gray-900">
                  {projects.length > 0 ? 'No matching projects' : 'No projects available'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {projects.length > 0
                    ? 'Try a different project name or description.'
                    : 'Create a project from the Todo or Categories pages first.'}
                </p>
              </div>
            )}
          </div>
      </div>
    </aside>
  );
};

export default ProjectFocusPanel;
