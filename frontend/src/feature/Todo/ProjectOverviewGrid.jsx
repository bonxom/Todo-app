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
          <p className="ui-page-kicker">Project Focus</p>
          <h2 id="project-overview-heading" className="text-xl font-semibold text-[var(--color-text)]">
            Track work by project
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Pick a project to focus the list, or keep tasks standalone when they do not belong to a larger effort.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateProject}
          className="ui-btn-secondary"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const isSelected = selectedProjectId === item.id;

          return (
            <article
              key={item.id}
              className={`relative ui-section-card p-5 text-left transition-[border-color,box-shadow,background-color] duration-200 ${
                isSelected
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-[var(--shadow-sm)]'
                  : 'hover:border-[var(--color-accent)]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectProject(item.id)}
                className="absolute inset-0 rounded-[var(--radius-lg)] focus-visible:outline-2 focus-visible:outline-[var(--ring-focus-outline)] focus-visible:outline-offset-2"
                aria-label={`View tasks for ${item.name}`}
                aria-pressed={isSelected}
              />

              <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                    {item.eyebrow}
                  </p>
                  <h3 className="mt-2 truncate text-lg font-semibold text-[var(--color-text)]">
                    {item.name}
                  </h3>
                  <p className="mt-1 min-h-[2.5rem] text-sm text-[var(--color-text-muted)]">
                    {item.description}
                  </p>
                </div>

                <span className="ui-chip ui-tabular shrink-0">
                  {item.completed} / {item.total}
                </span>
              </div>

              <div className="pointer-events-none relative z-10 mt-5">
                <ProgressBar
                  title={item.progressLabel}
                  completed={item.completed}
                  total={item.total}
                  compact
                  emptyLabel={item.emptyLabel}
                />
              </div>

              <div className="relative z-20 mt-5 flex flex-col gap-2 sm:flex-row">
                {item.isProject ? (
                  <button
                    type="button"
                    onClick={() => onAddTaskToProject?.(item.id)}
                    className="ui-btn-primary flex-1"
                    aria-label={`Add task to ${item.name}`}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
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
