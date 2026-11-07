import { workspaceTranslate } from "@/features/tasks/utils/workspaceTranslation";
import { workspaceKey } from "@/features/tasks/utils/workspaceTranslation";
import { getLocale } from "@/shared/i18n";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { useActivityQuery } from "../api/statQueries";
import { createHeatmapModel, formatUtcDateLabel } from "./statsUtils";
import { getApiErrorMessage } from "@/shared/services/apiError";

const label = (cell) =>
  workspaceTranslate("completedOnDay", {
    date: cell.dateKey,
    count: cell.count,
  });
const ActivityHeatmap = ({ dailyStats = [] }) => {
  const { t } = useTranslation("workspace");

  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const heatmap = useMemo(
    () => createHeatmapModel(dailyStats, 365),
    [dailyStats],
  );
  const activity = useActivityQuery(selected?.dateKey);
  const months = new Map(
    heatmap.monthLabels.map(({ columnIndex, label }) => [
      columnIndex,
      t(workspaceKey(label), { defaultValue: label }),
    ]),
  );
  const tasks = activity.data || [];
  return (
    <section className="statistics-card" aria-label={t("activityCalendar")}>
      <div className="statistics-card-header">
        <div>
          <h2>{t("yourConsistencyDayByDay")}</h2>
        </div>
        <span className="statistics-small-label">{t("last365Days")}</span>
      </div>
      <div className="statistics-heat-summary">
        <span>
          <strong>{heatmap.totalCompleted.toLocaleString(getLocale())}</strong>{" "}
          {t("tasksCompleted")}{" "}
        </span>
        <span>
          <strong>{heatmap.activeDays}</strong> {t("activeDays")}{" "}
        </span>
        <span>
          <strong>{heatmap.bestDay?.count || 0}</strong> {t("mostInADay")}{" "}
        </span>
      </div>
      <div className="statistics-heat-scroll">
        <div className="statistics-heat-grid">
          <div className="statistics-weekdays" aria-hidden="true">
            {["", t("mon"), "", t("wed"), "", t("fri"), ""].map((day, i) => (
              <span key={i}>{t(workspaceKey(day), { defaultValue: day })}</span>
            ))}
          </div>
          <div className="statistics-heat-weeks">
            {heatmap.weeks.map((week, index) => (
              <div className="statistics-heat-week" key={week[0].dateKey}>
                <span className="statistics-heat-month">
                  {months.get(index)}
                </span>
                {week.map((cell) => (
                  <button
                    type="button"
                    key={cell.dateKey}
                    className="statistics-heat-cell"
                    data-level={cell.level}
                    disabled={!cell.isInRange}
                    title={label(cell)}
                    aria-label={label(cell)}
                    aria-pressed={selected?.dateKey === cell.dateKey}
                    onClick={() =>
                      setSelected(
                        selected?.dateKey === cell.dateKey ? null : cell,
                      )
                    }
                    onMouseEnter={() => setHovered(cell)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(cell)}
                    onBlur={() => setHovered(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="statistics-heat-footer">
        <span>
          {hovered
            ? label(hovered)
            : heatmap.totalCompleted
              ? `${formatUtcDateLabel(heatmap.rangeStartKey, { month: "short", day: "numeric", year: "numeric" })} – ${formatUtcDateLabel(heatmap.rangeEndKey, { month: "short", day: "numeric", year: "numeric" })}`
              : t("yourFirstCompletedTaskIsTheStartOfSomethingGood")}
        </span>
        <div
          className="statistics-heat-legend"
          aria-label={t("activityIntensityLessToMore")}
        >
          <small>{t("less")}</small>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className="statistics-heat-cell"
              data-level={level}
            />
          ))}
          <small>{t("more")}</small>
        </div>
      </div>
      {selected && (
        <div className="statistics-day-detail" aria-live="polite">
          <div className="statistics-card-header">
            <div>
              <h3>
                {formatUtcDateLabel(selected.dateKey, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <p className="statistics-card-description">
                {t("completedTasksCasedCompletedtas")}
              </p>
            </div>
            <button
              type="button"
              aria-label={t("closeDayDetails")}
              onClick={() => setSelected(null)}
            >
              <X size={17} />
            </button>
          </div>
          <div className="statistics-day-list">
            {activity.isLoading ? (
              <p className="statistics-empty-note" role="status">
                {t("loadingYourCompletedTasks")}
              </p>
            ) : activity.isError ? (
              <div>
                <p className="statistics-empty-note">
                  {getApiErrorMessage(
                    activity.error,
                    t("unableToLoadCompletedTasks"),
                  )}
                </p>
                <button
                  className="ui-btn-secondary mt-3"
                  onClick={() => activity.refetch()}
                >
                  {t("tryAgainCasedTryagain")}
                </button>
              </div>
            ) : tasks.length ? (
              tasks.map((task) => (
                <article className="statistics-day-task" key={task._id}>
                  <Check size={16} />
                  <div>
                    {task.title || "Untitled task"}
                    <small>
                      {task.category?.name ||
                        task.categoryId?.name ||
                        "Uncategorized"}{" "}
                      ·{" "}
                      {task.project?.name ||
                        task.projectId?.name ||
                        "Standalone"}
                    </small>
                  </div>
                </article>
              ))
            ) : (
              <p className="statistics-empty-note">
                {t("noTasksWereCompletedOnThisDayAFreshStartIsAlwaysAhead")}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
export default ActivityHeatmap;
