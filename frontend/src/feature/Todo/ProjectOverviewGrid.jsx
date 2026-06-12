import { Plus } from 'lucide-react';
import ProgressBar from './ProgressBar';

const ProjectOverviewGrid = ({
  items,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onAddTaskToProject,
}) => {
  return (
    <section className="space-y-4" aria-labelledby="project-overview-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
            Project Focus
          </p>
          <h2 id="project-overview-heading" className="text-2xl font-semibold text-gray-900">
            Track work by project
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Pick a project to focus the list, or keep tasks standalone when they do not belong to a larger effort.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateProject}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 text-sm font-medium text-white shadow-md transition-all hover:from-sky-700 hover:to-cyan-700 hover:shadow-lg"
        >
          <Plus className="h-4 w-4" />
          <span>Add Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const isSelected = selectedProjectId === item.id;

          return (
            <article
              key={item.id}
              className={`relative rounded-3xl border p-5 text-left transition-all ${
                isSelected
                  ? 'border-sky-300 bg-gradient-to-br from-sky-50 via-white to-cyan-50 shadow-lg ring-4 ring-sky-200/60'
                  : 'border-gray-200 bg-white/85 shadow-sm hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectProject(item.id)}
                className="absolute inset-0 rounded-3xl focus:outline-none focus:ring-4 focus:ring-sky-200/70"
                aria-label={`View tasks for ${item.name}`}
                aria-pressed={isSelected}
              />

              <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                    {item.eyebrow}
                  </p>
                  <h3 className="mt-2 truncate text-lg font-semibold text-gray-900">
                    {item.name}
                  </h3>
                  <p className="mt-1 min-h-[2.5rem] text-sm text-gray-500">
                    {item.description}
                  </p>
                </div>

                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${item.badgeClassName}`}>
                  {item.completed} / {item.total}
                </span>
              </div>

              <div className="pointer-events-none relative z-10 mt-5">
                <ProgressBar
                  title={item.progressLabel}
                  completed={item.completed}
                  total={item.total}
                  compact
                  accentClassName={item.accentClassName}
                  emptyLabel={item.emptyLabel}
                />
              </div>

              <div className="relative z-20 mt-5 flex flex-col gap-2 sm:flex-row">


                {item.isProject ? (
                  <button
                    type="button"
                    onClick={() => onAddTaskToProject?.(item.id)}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200/70"
                    aria-label={`Add task to ${item.name}`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Task</span>
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ProjectOverviewGrid;
