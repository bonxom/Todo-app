import { useMemo } from 'react';
import { Check, Layers, Plus, RotateCcw } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { calculateProjectMetrics } from '../utils/taskFilterPipeline';
import { getProjectColor } from '@/shared/utils/projectColor';
import { canCompleteProject, filterProjectsByVisibility, isCompletedProject } from '@/shared/utils/projectStatus';

const ALL_PROJECT_FILTER = 'all-projects';
const STANDALONE_PROJECT_FILTER = 'standalone-projects';

const ProjectFocusRail = ({
  projects = [],
  rawTasks = [],
  selectedProjectId = ALL_PROJECT_FILTER,
  onSelectProject,
  showCompletedProjects = false,
  onShowCompletedProjectsChange,
  onCreateProject,
  onCreateCategory,
  onAddTaskToProject,
  onCompleteProject,
  onRestoreProject,
  isLoading = false,
}) => {
  // 1. Overall Workspace Metrics (Independent of any filter)
  const overallMetrics = useMemo(() => {
    const total = rawTasks.length;
    const completed = rawTasks.filter((t) => t.status === 'completed').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, progress };
  }, [rawTasks]);

  // 2. Standalone Metrics
  const standaloneMetrics = useMemo(() => {
    return calculateProjectMetrics(rawTasks, null);
  }, [rawTasks]);

  // 3. Visible Projects list
  const visibleProjects = useMemo(() => {
    return filterProjectsByVisibility(projects, showCompletedProjects);
  }, [projects, showCompletedProjects]);

  if (isLoading) {
    return (
      <aside className="ui-project-focus-rail space-y-4">
        <div className="h-24 animate-pulse ui-section-card rounded-[14px]" />
        <div className="h-64 animate-pulse ui-section-card rounded-[14px]" />
      </aside>
    );
  }

  return (
    <aside className="ui-project-focus-rail space-y-4" aria-label="Project focus rail">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="ui-page-kicker !text-[11px]">Workstreams</p>
          <h2 className="text-base font-semibold text-[var(--color-text)]">Project Focus</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCreateCategory}
            className="ui-btn-secondary !min-h-[2rem] !px-2.5 !text-xs cursor-pointer"
            title="Add Category"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Category</span>
          </button>
          <button
            type="button"
            onClick={onCreateProject}
            className="ui-btn-primary !min-h-[2rem] !px-2.5 !text-xs cursor-pointer"
            title="Add Project"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Project</span>
          </button>
        </div>
      </div>

      {/* Overall Progress Widget */}
      <ProgressBar
        title="Workspace Progress"
        completed={overallMetrics.completed}
        total={overallMetrics.total}
        compact
      />

      {/* Filter Options (Completed project toggle) */}
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] px-1">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showCompletedProjects}
            onChange={(e) => onShowCompletedProjectsChange?.(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[var(--color-line)] accent-[var(--color-accent)]"
          />
          <span>Show Completed Projects</span>
        </label>
        <span>{visibleProjects.length} projects</span>
      </div>

      {/* Scrollable Project Cards Container */}
      <div className="space-y-2.5 max-h-[calc(100dvh-18rem)] overflow-y-auto pr-1">
        {/* All Tasks Card */}
        <article
          onClick={() => onSelectProject(ALL_PROJECT_FILTER)}
          className={`ui-section-card relative cursor-pointer p-3.5 transition-all duration-150 ${
            selectedProjectId === ALL_PROJECT_FILTER
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-xs'
              : 'hover:border-[var(--color-accent)]'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">All Tasks</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Every task in your workspace</p>
            </div>
            <span className="ui-chip ui-tabular !text-[11px] !min-h-[1.5rem]">
              {overallMetrics.completed}/{overallMetrics.total}
            </span>
          </div>
        </article>

        {/* Standalone (No Project) Card */}
        <article
          onClick={() => onSelectProject(STANDALONE_PROJECT_FILTER)}
          className={`ui-section-card relative cursor-pointer p-3.5 transition-all duration-150 ${
            selectedProjectId === STANDALONE_PROJECT_FILTER
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-xs'
              : 'hover:border-[var(--color-accent)]'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">No Project</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Standalone daily tasks</p>
            </div>
            <span className="ui-chip ui-tabular !text-[11px] !min-h-[1.5rem]">
              {standaloneMetrics.completed}/{standaloneMetrics.total}
            </span>
          </div>
        </article>

        {/* Concrete Projects */}
        {visibleProjects.map((project) => {
          const isSelected = selectedProjectId === project._id;
          const isCompleted = isCompletedProject(project);
          const projectColor = getProjectColor(project);
          const metrics = calculateProjectMetrics(rawTasks, project._id);

          const projectTasks = rawTasks.filter((t) => {
            const pid = t.projectId?._id || t.projectId;
            return pid === project._id;
          });
          const canComplete = canCompleteProject(projectTasks);

          return (
            <article
              key={project._id}
              onClick={() => onSelectProject(project._id)}
              className={`ui-section-card relative cursor-pointer p-3.5 transition-all duration-150 ${
                isSelected
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-xs'
                  : 'hover:border-[var(--color-accent)]'
              } ${isCompleted ? 'opacity-75' : ''}`}
              style={{ borderLeftColor: projectColor, borderLeftWidth: '5px' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                      {project.description}
                    </p>
                  )}
                </div>

                <span className="ui-chip ui-tabular !text-[11px] !min-h-[1.5rem] shrink-0">
                  {metrics.completed}/{metrics.total}
                </span>
              </div>

              {/* Progress bar inside card */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] mb-1">
                  <span>Progress</span>
                  <span className="ui-tabular font-medium">{metrics.progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-200"
                    style={{ width: `${metrics.progress}%` }}
                  />
                </div>
              </div>

              {/* Project Action Row */}
              <div
                className="mt-3 flex items-center justify-end gap-1.5 border-t border-[var(--color-line)] pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                {canComplete && !isCompleted && (
                  <button
                    type="button"
                    onClick={() => onCompleteProject?.(project._id)}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--color-success)] bg-[var(--color-success-soft)] px-2 text-[11px] font-semibold text-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-white transition-colors cursor-pointer"
                  >
                    <Check className="h-3 w-3" />
                    <span>Complete</span>
                  </button>
                )}
                {isCompleted && (
                  <button
                    type="button"
                    onClick={() => onRestoreProject?.(project._id)}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restore</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onAddTaskToProject?.(project._id)}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-2 text-[11px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Task</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
};

export default ProjectFocusRail;
