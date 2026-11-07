import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("workspace");

  const visibleProjects = filterProjectsByVisibility(
    projects,
    showCompletedProjects,
  );
  return (
    <aside className="todo-project-rail" aria-label={t("projectsAndProgress")}>
      <section className="todo-progress-card">
        <div className="todo-progress-heading">
          <span className="todo-eyebrow">{t("theBigPicture")}</span>
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
              {completion === 100 ? t("lookAtYouGo") : t("youReMovingForward")}
            </h2>
            <p>
              {completion === null ? (
                t("yourProgressWillAppearHere")
              ) : (
                <>
                  <strong>
                    {completedCount} {t("of")} {totalCount}
                  </strong>{" "}
                  {t("tasksComplete")}
                  <br />
                  {t("everySmallWinCounts")}
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
              {t("projects")}{" "}
              <span className="todo-count">{visibleProjects.length}</span>
            </h2>
            <span>{t("aHomeForTheBiggerPicture")}</span>
          </div>
          <button
            type="button"
            className="todo-icon-button"
            onClick={onCreateProject}
            aria-label={t("addProjectCasedAddproject")}
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
            {t("allProjects")}
          </button>
          <button
            type="button"
            aria-pressed={selectedProjectId === "standalone-projects"}
            onClick={() => onSelectProject("standalone-projects")}
          >
            <Folder size={15} />
            {t("standalone")}
          </button>
        </div>
        <div className="todo-project-list">
          {isLoading ? (
            <p className="todo-project-empty" role="status">
              {t("loadingYourProjects")}
            </p>
          ) : visibleProjects.length === 0 ? (
            <div className="todo-project-empty">
              <Folder size={25} />
              <h3>{t("bigIdeasStartHere")}</h3>
              <p>
                {t(
                  "groupRelatedTasksIntoAProjectAndGiveYourPlansALittleDirection",
                )}
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
                    aria-label={t("messages.filterByV0", { v0: project.name })}
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
                            {t("tasksLower")}{" "}
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
                        {t("completeProject")}
                      </button>
                    )}
                    {done ? (
                      <button
                        type="button"
                        onClick={() => onRestoreProject(project._id)}
                      >
                        <RotateCcw size={13} />
                        {t("restoreProject")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={t("messages.addTaskToV0", {
                          v0: project.name,
                        })}
                        onClick={() => onAddTaskToProject(project._id)}
                      >
                        <Plus size={13} />
                        {t("addTask")}
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
          {t("showCompletedProjectsCasedShowcomplete")}
        </label>
      </section>
    </aside>
  );
};
export default ProjectFocusRail;
