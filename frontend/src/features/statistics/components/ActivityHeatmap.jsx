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
    <section
      className="statistics-card [background:var(--color-surface)] [border:1px_solid_var(--color-line)] rounded-[14px] p-[24px]
      min-w-[0] [&_h2]:text-[15px] [&_h2]:[font-weight:600] [&_h2]:[letter-spacing:-0.015em] [&_h3]:text-[15px]
      [&_h3]:[font-weight:600] [&_h3]:[letter-spacing:-0.015em]
      [@media(max-width:700px)]:p-[20px]"
      aria-label={t("activityCalendar")}
    >
      <div className="statistics-card-header flex items-start justify-between gap-[20px]">
        <div>
          <h2>{t("yourConsistencyDayByDay")}</h2>
        </div>
        <span className="statistics-small-label text-[10px] text-[var(--color-text-muted)] [background:var(--color-surface-muted)] rounded-[5px] p-[4px_8px] whitespace-nowrap">
          {t("last365Days")}
        </span>
      </div>
      <div
        className="statistics-heat-summary flex gap-[24px] m-[22px_0] text-[11px] text-[var(--color-text-muted)]
        [&_strong]:[font-weight:600] [&_strong]:text-[var(--color-text)] [&_strong]:pr-[5px]
        [@media(max-width:700px)]:flex-wrap [@media(max-width:700px)]:gap-[10px_20px]"
      >
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
      <div className="statistics-heat-scroll overflow-x-auto p-[3px_3px_12px]">
        <div className="statistics-heat-grid flex gap-[10px] min-w-[720px] items-stretch">
          <div
            className="statistics-weekdays w-[26px] shrink-0 pt-[24px] grid grid-rows-[repeat(7,1fr)] gap-[4px] text-[9px]
            text-[var(--color-text-muted)] [&_span]:flex [&_span]:items-center [&_span]:justify-end
            [&_span]:[line-height:1]"
            aria-hidden="true"
          >
            {["", t("mon"), "", t("wed"), "", t("fri"), ""].map((day, i) => (
              <span key={i}>{t(workspaceKey(day), { defaultValue: day })}</span>
            ))}
          </div>
          <div className="statistics-heat-weeks flex gap-[4px] flex-1">
            {heatmap.weeks.map((week, index) => (
              <div
                className="statistics-heat-week flex-1 min-w-[9px] flex flex-col gap-[4px]"
                key={week[0].dateKey}
              >
                <span className="statistics-heat-month h-[20px] text-[9px] text-[var(--color-text-muted)]">
                  {months.get(index)}
                </span>
                {week.map((cell) => (
                  <button
                    type="button"
                    key={cell.dateKey}
                    className="statistics-heat-cell block w-full aspect-[1_/_1] h-auto
                      [border:1px_solid_color-mix(in_srgb,var(--color-accent)_10%,transparent)] rounded-[3px] cursor-pointer
                      [background:var(--color-surface-muted)] [&:disabled]:[visibility:hidden]"
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
      <div className="statistics-heat-footer flex justify-between gap-[16px] mt-[10px] text-[11px] text-[var(--color-text-muted)] [@media(max-width:700px)]:flex-wrap">
        <span>
          {hovered
            ? label(hovered)
            : heatmap.totalCompleted
              ? `${formatUtcDateLabel(heatmap.rangeStartKey, { month: "short", day: "numeric", year: "numeric" })} – ${formatUtcDateLabel(heatmap.rangeEndKey, { month: "short", day: "numeric", year: "numeric" })}`
              : t("yourFirstCompletedTaskIsTheStartOfSomethingGood")}
        </span>
        <div
          className="statistics-heat-legend flex gap-[4px] items-center [&_span]:w-[11px] [&_span]:h-[11px] [&_small]:m-[0_4px]"
          aria-label={t("activityIntensityLessToMore")}
        >
          <small>{t("less")}</small>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className="statistics-heat-cell block w-full aspect-[1_/_1] h-auto
                [border:1px_solid_color-mix(in_srgb,var(--color-accent)_10%,transparent)] rounded-[3px] cursor-pointer
                [background:var(--color-surface-muted)] [&:disabled]:[visibility:hidden]"
              data-level={level}
            />
          ))}
          <small>{t("more")}</small>
        </div>
      </div>
      {selected && (
        <div
          className="statistics-day-detail [border-top:1px_solid_var(--color-line)] mt-[20px] pt-[20px] [&_button]:cursor-pointer"
          aria-live="polite"
        >
          <div className="statistics-card-header flex items-start justify-between gap-[20px]">
            <div>
              <h3>
                {formatUtcDateLabel(selected.dateKey, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <p className="statistics-card-description mt-[5px] text-[var(--color-text-muted)] text-[12px]">
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
          <div className="statistics-day-list grid gap-[8px] mt-[14px]">
            {activity.isLoading ? (
              <p
                className="statistics-empty-note text-[12px] text-[var(--color-text-muted)] [line-height:1.7]"
                role="status"
              >
                {t("loadingYourCompletedTasks")}
              </p>
            ) : activity.isError ? (
              <div>
                <p className="statistics-empty-note text-[12px] text-[var(--color-text-muted)] [line-height:1.7]">
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
                <article
                  className="statistics-day-task p-[12px_14px] rounded-[8px] [background:var(--color-surface-muted)] flex items-center
                  gap-[10px] text-[12px] wrap-anywhere [&_svg]:text-[var(--color-success)] [&_svg]:shrink-0 [&_small]:block
                  [&_small]:mt-[3px] [&_small]:text-[var(--color-text-muted)]"
                  key={task._id}
                >
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
              <p className="statistics-empty-note text-[12px] text-[var(--color-text-muted)] [line-height:1.7]">
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
