import { Check, Plus, RotateCcw } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { isCompletedProject } from '../../utils/projectStatus';

const ProjectOverviewGrid = ({
  items,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onAddTaskToProject,
  showCompletedProjects,
  onShowCompletedProjectsChange,
  onCompleteProject,
  onRestoreProject,
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

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={showCompletedProjects}
              onChange={(event) => onShowCompletedProjectsChange?.(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-line)] accent-[var(--color-accent)]"
            />
            Show Completed Projects
          </label>
          <button
            type="button"
            onClick={onCreateProject}
            className="ui-btn-secondary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Project</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const isSelected = selectedProjectId === item.id;
          const isCompleted = isCompletedProject(item);

          return (
            <article
              key={item.id}
              className={`relative ui-section-card p-5 text-left transition-[border-color,box-shadow,background-color] duration-200 ${
                isSelected
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-[var(--shadow-sm)]'
                  : 'hover:border-[var(--color-accent)]'
              } ${isCompleted ? 'opacity-75' : ''}`}
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
                {item.isProject && item.canComplete ? (
                  <button
                    type="button"
                    onClick={() => onCompleteProject?.(item.id)}
                    className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[var(--color-success-soft)] px-4 text-sm font-semibold text-[var(--color-success)] transition-[background-color,border-color,color] duration-150 hover:bg-[var(--color-success)] hover:text-white"
                    aria-label={`Complete and hide ${item.name}`}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span>Complete</span>
                  </button>
                ) : null}
                {item.isProject && isCompleted ? (
                  <button
                    type="button"
                    onClick={() => onRestoreProject?.(item.id)}
                    className="ui-btn-secondary flex-1"
                    aria-label={`Restore ${item.name}`}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    <span>Restore</span>
                  </button>
                ) : null}
                {item.isProject && !isCompleted ? (
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
