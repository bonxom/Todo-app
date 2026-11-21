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
    <aside
      className="todo-project-rail flex-col gap-[1.125rem] [@media(max-width:800px)]:grid-cols-[1fr_1fr] [@media(max-width:800px)]:[align-items:start]"
      aria-label={t("projectsAndProgress")}
    >
      <section className="todo-progress-card p-[1.125rem] rounded-[var(--radius-lg)] [border:1px_solid_var(--color-line)] [background:var(--color-surface-muted)]">
        <div className="todo-progress-heading flex items-center justify-between text-[var(--color-text-muted)]">
          <span className="todo-eyebrow flex items-center gap-[7px] [font-weight:600] uppercase">
            {t("theBigPicture")}
          </span>
          <ArrowUpRight size={17} />
        </div>
        <div
          className="todo-progress-body flex items-center gap-[15px] mt-[1rem] [&_h2]:text-[1rem] [&_h2]:[font-weight:650]
          [&_h2]:m-[0_0_7px] [&_p]:text-[0.625rem] [&_p]:text-[var(--color-text-muted)] [&_p]:[line-height:1.8]
          [&_strong]:[font-weight:600] [&_strong]:text-[var(--color-text)]
          [@media(max-width:520px)]:gap-[var(--space-5)]"
        >
          <div
            className="todo-progress-ring w-[62px] h-[62px] shrink-0 rounded-[50%]
              [background:conic-gradient(_var(--color-accent)_var(--progress),var(--color-line)_0_)] grid place-items-center
              [transform:rotate(-90deg)] [&_>_span]:[transform:rotate(90deg)] [&_>_span]:w-[51px] [&_>_span]:h-[51px]
              [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:[background:var(--color-surface-muted)]
              [&_>_span]:rounded-[50%] [&_>_span]:text-[0.9375rem] [&_>_span]:[font-weight:600]"
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
      <section
        className="todo-projects [background:var(--color-surface)] [border:1px_solid_var(--color-line)]
        rounded-[var(--radius-lg)] pb-[1rem] [box-shadow:var(--shadow-xs)]
        [@media(max-width:800px)]:col-2 [@media(max-width:800px)]:row-[1_/_span_3]"
      >
        <div
          className="todo-panel-heading flex items-center justify-between gap-[var(--space-3)] [&_h2]:text-[1rem]
          [&_h2]:[font-weight:650] [&_h2]:[letter-spacing:-0.01em] [&_h2]:m-[0] [&_>_div_>_span]:block
          [&_>_div_>_span]:text-[0.6875rem] [&_>_div_>_span]:text-[var(--color-text-muted)] [&_>_div_>_span]:mt-[5px]"
        >
          <div>
            <h2>
              {t("projects")}{" "}
              <span
                className="todo-count text-[var(--color-text-muted)] text-[0.625rem] [background:var(--color-surface-muted)]
                [border:1px_solid_var(--color-line)] p-[2px_6px] rounded-[5px] whitespace-nowrap [font-weight:600] ml-[4px]
                align-middle"
              >
                {visibleProjects.length}
              </span>
            </h2>
            <span>{t("aHomeForTheBiggerPicture")}</span>
          </div>
          <button
            type="button"
            className="todo-icon-button min-w-[28px] h-[28px] inline-grid place-items-center rounded-[5px] [&:hover]:[background:var(--color-accent-soft)]"
            onClick={onCreateProject}
            aria-label={t("addProjectCasedAddproject")}
          >
            <Plus size={18} />
          </button>
        </div>
        <div
          className="todo-project-shortcuts flex gap-[6px] p-[0_1rem_1rem] [border-bottom:1px_solid_var(--color-line)]
          [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:gap-[6px] [&_button]:flex-1
          [&_button]:p-[8px_4px] [&_button]:rounded-[5px] [&_button]:[border:1px_solid_var(--color-line)]
          [&_button[aria-pressed=true]]:[background:var(--color-accent-soft)]
          [&_button[aria-pressed=true]]:border-[color-mix(in_srgb,var(--color-accent)_24%,var(--color-line))]"
        >
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
        <div className="todo-project-list p-[4px_1rem_0]">
          {isLoading ? (
            <p
              className="todo-project-empty p-[var(--space-6)_3px] text-[var(--color-text-muted)] text-[0.6875rem] [line-height:1.8]
              [&_svg]:text-[var(--color-accent)] [&_svg]:mb-[var(--space-3)] [&_h3]:text-[var(--color-text)]
              [&_h3]:text-[1.125rem] [&_h3]:[font-weight:650] [&_h3]:mb-[7px]"
              role="status"
            >
              {t("loadingYourProjects")}
            </p>
          ) : visibleProjects.length === 0 ? (
            <div
              className="todo-project-empty p-[var(--space-6)_3px] text-[var(--color-text-muted)] text-[0.6875rem] [line-height:1.8]
              [&_svg]:text-[var(--color-accent)] [&_svg]:mb-[var(--space-3)] [&_h3]:text-[var(--color-text)]
              [&_h3]:text-[1.125rem] [&_h3]:[font-weight:650] [&_h3]:mb-[7px]"
            >
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
                  className="todo-project [border-bottom:1px_solid_var(--color-line)] p-[1rem_0_0.75rem] [&:last-child]:[border-bottom:0]
                    [&[data-selected=true]_.todo-project-name_strong]:text-[var(--color-accent)]
                    [&[data-selected=true]_.todo-project-name_strong]:[text-decoration:underline]
                    [&[data-selected=true]_.todo-project-name_strong]:[text-underline-offset:4px]"
                  data-selected={selectedProjectId === project._id}
                  style={{ "--project-color": getProjectColor(project) }}
                >
                  <button
                    type="button"
                    className="todo-project-select block w-full text-left rounded-[5px] [&:hover_.todo-project-name_strong]:text-[var(--color-accent)]"
                    onClick={() => onSelectProject(project._id)}
                    aria-pressed={selectedProjectId === project._id}
                    aria-label={t("messages.filterByV0", { v0: project.name })}
                  >
                    <span
                      className="todo-project-name flex items-center gap-[9px] [&_strong]:[font-weight:600] [&_strong]:min-w-[0]
                      [&_strong]:wrap-anywhere [&_>_svg]:ml-auto [&_>_svg]:shrink-0 [&_>_svg]:text-[var(--color-text-muted)]
                      [&_>_svg]:opacity-[0.65]"
                    >
                      <span
                        className="todo-project-icon w-[29px] h-[29px] shrink-0 grid place-items-center
                        [background:color-mix(_in_srgb,var(--project-color)_12%,var(--color-surface)_)] text-[var(--project-color)]
                        rounded-[7px]"
                      >
                        <Folder size={17} />
                      </span>
                      <strong>{project.name}</strong>
                      <ArrowUpRight size={15} />
                    </span>
                    {project.description && (
                      <span className="todo-project-description block text-[var(--color-text-muted)] text-[0.625rem] mt-[8px] [line-height:1.6] [@media(max-width:520px)]:text-[0.6875rem]">
                        {project.description}
                      </span>
                    )}
                    {summary && (
                      <>
                        <span
                          className="todo-project-meter block h-[4px] [background:var(--color-surface-muted)] rounded-[4px] mt-[14px]
                          overflow-hidden [&_>_span]:block [&_>_span]:h-full [&_>_span]:[background:var(--project-color)]
                          [&_>_span]:rounded-[4px]"
                        >
                          <span style={{ width: `${progress}%` }} />
                        </span>
                        <span className="todo-project-metrics flex justify-between text-[0.5625rem] text-[var(--color-text-muted)] mt-[7px]">
                          <span>
                            {summary.completedTasks} / {summary.totalTasks}{" "}
                            {t("tasksLower")}{" "}
                          </span>
                          <span>{progress}%</span>
                        </span>
                      </>
                    )}
                  </button>
                  <div
                    className="todo-project-actions flex justify-end gap-[10px] mt-[8px] [&_button]:flex [&_button]:items-center
                    [&_button]:gap-[4px] [&_button]:min-h-[25px] [&_button:hover]:[text-decoration:underline]"
                  >
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
        <label className="todo-completed-toggle flex items-center gap-[7px] text-[0.625rem] text-[var(--color-text-muted)] m-[0_1.125rem] cursor-pointer [&_input]:w-[12px] [&_input]:h-[12px]">
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
