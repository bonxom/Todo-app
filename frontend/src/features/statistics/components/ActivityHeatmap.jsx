import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { useActivityQuery } from "../api/statQueries";
import { createHeatmapModel, formatUtcDateLabel } from "./statsUtils";
import { getApiErrorMessage } from "@/shared/services/apiError";

const label = (cell) =>
  `${cell.dateKey}: ${cell.count} ${cell.count === 1 ? "task" : "tasks"} completed`;
const ActivityHeatmap = ({ dailyStats = [] }) => {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const heatmap = useMemo(
    () => createHeatmapModel(dailyStats, 365),
    [dailyStats],
  );
  const activity = useActivityQuery(selected?.dateKey);
  const months = new Map(
    heatmap.monthLabels.map(({ columnIndex, label }) => [columnIndex, label]),
  );
  const tasks = activity.data || [];
  return (
    <section className="statistics-card" aria-label="Activity calendar">
      <div className="statistics-card-header">
        <div>
          <h2>Your consistency, day by day</h2>
          <p className="statistics-card-description">
            Small wins leave a trail. Select a day to revisit yours.
          </p>
        </div>
        <span className="statistics-small-label">Last 365 days</span>
      </div>
      <div className="statistics-heat-summary">
        <span>
          <strong>{heatmap.totalCompleted.toLocaleString()}</strong> tasks
          completed
        </span>
        <span>
          <strong>{heatmap.activeDays}</strong> active days
        </span>
        <span>
          <strong>{heatmap.bestDay?.count || 0}</strong> most in a day
        </span>
      </div>
      <div className="statistics-heat-scroll">
        <div className="statistics-heat-grid">
          <div className="statistics-weekdays" aria-hidden="true">
            {["", "Mon", "", "Wed", "", "Fri", ""].map((day, i) => (
              <span key={i}>{day}</span>
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
              : "Your first completed task is the start of something good."}
        </span>
        <div
          className="statistics-heat-legend"
          aria-label="Activity intensity: less to more"
        >
          <small>Less</small>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className="statistics-heat-cell"
              data-level={level}
            />
          ))}
          <small>More</small>
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
              <p className="statistics-card-description">Completed tasks</p>
            </div>
            <button
              type="button"
              aria-label="Close day details"
              onClick={() => setSelected(null)}
            >
              <X size={17} />
            </button>
          </div>
          <div className="statistics-day-list">
            {activity.isLoading ? (
              <p className="statistics-empty-note" role="status">
                Loading your completed tasks…
              </p>
            ) : activity.isError ? (
              <div>
                <p className="statistics-empty-note">
                  {getApiErrorMessage(
                    activity.error,
                    "Unable to load completed tasks.",
                  )}
                </p>
                <button
                  className="ui-btn-secondary mt-3"
                  onClick={() => activity.refetch()}
                >
                  Try again
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
                No tasks were completed on this day. A fresh start is always
                ahead.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
export default ActivityHeatmap;
