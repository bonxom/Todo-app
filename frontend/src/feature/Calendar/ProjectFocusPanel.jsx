import { useMemo } from 'react';
import { FolderKanban, Layers3 } from 'lucide-react';

const ProjectFocusPanel = ({
  projects,
  selectedProjectIds,
  onToggleProject,
  onSelectAllProjects,
  onClearProjects,
}) => {
  const selectedProjectSet = useMemo(() => new Set(selectedProjectIds), [selectedProjectIds]);
  const hasProjectFilter = selectedProjectIds.length > 0;

  return (
    <aside className="flex h-full flex-col gap-5 rounded-[2rem] border border-gray-200 bg-white p-5 shadow-lg">
      <div className="rounded-[1.7rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-600">Project Filters</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">Choose workstreams</h2>
            <p className="mt-2 text-sm text-gray-600">
              Select projects to filter the calendar. Clear filters to show standalone and project tasks together.
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
            <FolderKanban className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSelectAllProjects}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-white px-4 text-sm font-medium text-sky-700 transition-all hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus:ring-4 focus:ring-sky-100"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onClearProjects}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100"
          >
            Clear
          </button>
        </div>
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

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {projects.length > 0 ? projects.map((project) => {
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
                <p className="text-sm font-semibold text-gray-900">No projects available</p>
                <p className="mt-1 text-xs text-gray-500">Create a project from the Todo or Categories pages first.</p>
              </div>
            )}
          </div>
      </div>
    </aside>
  );
};

export default ProjectFocusPanel;
