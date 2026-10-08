import {
  ArrowUpRight,
  Check,
  Folder,
  Layers,
  Plus,
  RotateCcw,
} from "lucide-react";
import { getProjectColor } from "@/shared/utils/projectColor";
import {
  filterProjectsByVisibility,
  isCompletedProject,
} from "@/shared/utils/projectStatus";

const ProjectFocusRail = ({
  projects = [],
  selectedProjectId,
  onSelectProject,
  showCompletedProjects,
  onShowCompletedProjectsChange,
  onCreateProject,
  onAddTaskToProject,
  onCompleteProject,
  onRestoreProject,
  isLoading,
  completion,
  completedCount,
  totalCount,
}) => {
  const visibleProjects = filterProjectsByVisibility(
    projects,
    showCompletedProjects,
  );
  return (
    <aside className="todo-project-rail" aria-label="Projects and progress">
      <section className="todo-progress-card">
        <div className="todo-progress-heading">
          <span className="todo-eyebrow">THE BIG PICTURE</span>
          <ArrowUpRight size={17} />
        </div>
        <div className="todo-progress-body">
          <div
            className="todo-progress-ring"
            style={{ "--progress": `${completion ?? 0}%` }}
          >
            <span>{completion === null ? "—" : `${completion}%`}</span>
          </div>
          <div>
            <h2>
              {completion === 100
                ? "Look at you go."
                : "You’re moving forward."}
            </h2>
            <p>
              {completion === null ? (
                "Your progress will appear here."
              ) : (
                <>
                  <strong>
                    {completedCount} of {totalCount}
                  </strong>{" "}
                  tasks complete.
                  <br />
                  Every small win counts.
                </>
              )}
            </p>
          </div>
        </div>
      </section>
      <section className="todo-projects">
        <div className="todo-panel-heading">
          <div>
            <h2>
              Projects{" "}
              <span className="todo-count">{visibleProjects.length}</span>
            </h2>
            <span>A home for the bigger picture.</span>
          </div>
          <button
            type="button"
            className="todo-icon-button"
            onClick={onCreateProject}
            aria-label="Add project"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="todo-project-shortcuts">
          <button
            type="button"
            aria-pressed={selectedProjectId === "all-projects"}
            onClick={() => onSelectProject("all-projects")}
          >
            <Layers size={15} />
            All projects
          </button>
          <button
            type="button"
            aria-pressed={selectedProjectId === "standalone-projects"}
            onClick={() => onSelectProject("standalone-projects")}
          >
            <Folder size={15} />
            Standalone
          </button>
        </div>
        <div className="todo-project-list">
          {isLoading ? (
            <p className="todo-project-empty" role="status">
              Loading your projects…
            </p>
          ) : visibleProjects.length === 0 ? (
            <div className="todo-project-empty">
              <Folder size={25} />
              <h3>Big ideas start here.</h3>
              <p>
                Group related tasks into a project and give your plans a little
                direction.
              </p>
            </div>
          ) : (
            visibleProjects.map((project) => {
              const summary = project.summary;
              const progress = summary?.totalTasks
                ? Math.round(
                    (summary.completedTasks / summary.totalTasks) * 100,
                  )
                : 0;
              const done = isCompletedProject(project);
              return (
                <article
                  key={project._id}
                  className="todo-project"
                  data-selected={selectedProjectId === project._id}
                  style={{ "--project-color": getProjectColor(project) }}
                >
                  <button
                    type="button"
                    className="todo-project-select"
                    onClick={() => onSelectProject(project._id)}
                    aria-pressed={selectedProjectId === project._id}
                    aria-label={`Filter by ${project.name}`}
                  >
                    <span className="todo-project-name">
                      <span className="todo-project-icon">
                        <Folder size={17} />
                      </span>
                      <strong>{project.name}</strong>
                      <ArrowUpRight size={15} />
                    </span>
                    {project.description && (
                      <span className="todo-project-description">
                        {project.description}
                      </span>
                    )}
                    {summary && (
                      <>
                        <span className="todo-project-meter">
                          <span style={{ width: `${progress}%` }} />
                        </span>
                        <span className="todo-project-metrics">
                          <span>
                            {summary.completedTasks} / {summary.totalTasks}{" "}
                            tasks
                          </span>
                          <span>{progress}%</span>
                        </span>
                      </>
                    )}
                  </button>
                  <div className="todo-project-actions">
                    {summary?.canComplete && !done && (
                      <button
                        type="button"
                        onClick={() => onCompleteProject(project._id)}
                      >
                        <Check size={13} />
                        Complete project
                      </button>
                    )}
                    {done ? (
                      <button
                        type="button"
                        onClick={() => onRestoreProject(project._id)}
                      >
                        <RotateCcw size={13} />
                        Restore project
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Add task to ${project.name}`}
                        onClick={() => onAddTaskToProject(project._id)}
                      >
                        <Plus size={13} />
                        Add task
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
        <label className="todo-completed-toggle">
          <input
            type="checkbox"
            checked={showCompletedProjects}
            onChange={(e) => onShowCompletedProjectsChange(e.target.checked)}
          />
          Show completed projects
        </label>
      </section>
    </aside>
  );
};
export default ProjectFocusRail;
