import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, RefreshCw, AlertCircle, Calendar } from "lucide-react";
import {
  createHeatmapModel,
  formatUtcDateLabel,
} from "@/features/statistics/components/statsUtils";
import { useActivityQuery } from "@/features/statistics/api/statQueries";
import { getApiErrorMessage } from "@/shared/services/apiError";
import GlassPanel from "../GlassPanel";
import type { DailyStat, Task } from "@/shared/types/domain";

export interface StatisticsActivityProps {
  dailyStats: DailyStat[];
}

interface HeatmapCell {
  dateKey: string | null;
  count: number;
  level: number;
  isInRange: boolean;
  weekdayIndex: number;
  dayOfMonth: number;
}

export default function StatisticsActivity({
  dailyStats,
}: StatisticsActivityProps) {
  const { t, i18n } = useTranslation("v2");
  const locale = i18n.language || "en";

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const heatmapModel = useMemo(
    () => createHeatmapModel(dailyStats, 365),
    [dailyStats],
  );

  const monthsMap = useMemo(() => {
    const map = new Map<number, string>();
    (heatmapModel.monthLabels || []).forEach(
      ({ columnIndex }: { columnIndex: number; label: string }) => {
        const firstMonthCell = heatmapModel.weeks[columnIndex].find(
          (cell: HeatmapCell) => cell.isInRange && cell.dayOfMonth <= 7,
        );
        if (firstMonthCell?.dateKey) {
          map.set(
            columnIndex,
            new Intl.DateTimeFormat(locale, {
              month: "short",
              timeZone: "UTC",
            }).format(new Date(`${firstMonthCell.dateKey}T00:00:00Z`)),
          );
        }
      },
    );
    return map;
  }, [heatmapModel, locale]);

  const activityQuery = useActivityQuery(selectedDateKey ?? undefined, {
    enabled: Boolean(selectedDateKey),
  });

  const handleDayClick = (dateKey: string) => {
    if (selectedDateKey === dateKey) {
      setSelectedDateKey(null);
    } else {
      setSelectedDateKey(dateKey);
    }
  };

  const handleCloseDetails = () => {
    const prevKey = selectedDateKey;
    setSelectedDateKey(null);
    if (prevKey && cellRefs.current[prevKey]) {
      cellRefs.current[prevKey]?.focus();
    }
  };

  const formattedSelectedDate = selectedDateKey
    ? formatUtcDateLabel(selectedDateKey, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const formattedRangeStart = formatUtcDateLabel(heatmapModel.rangeStartKey, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedRangeEnd = formatUtcDateLabel(heatmapModel.rangeEndKey, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const weekdayLabels = [
    "",
    t("statisticsPage.mon", "Mon"),
    "",
    t("statisticsPage.wed", "Wed"),
    "",
    t("statisticsPage.fri", "Fri"),
    "",
  ];

  return (
    <GlassPanel className="v2-workspace-panel v2-statistics-activity-card">
      {/* Top Header with title on left and metric pills on right */}
      <div className="v2-statistics-activity-header">
        <div className="v2-statistics-card-header">
          <h2 className="v2-statistics-card-title">
            {t("statisticsPage.activityHeading")}
          </h2>
          <span className="v2-statistics-card-subtitle">
            {t("statisticsPage.activitySubheading")}
          </span>
        </div>

        <div className="v2-statistics-activity-pills">
          <div className="v2-statistics-pill">
            <span className="v2-statistics-pill-label">{t("completed")}</span>
            <span className="v2-statistics-pill-val">
              {heatmapModel.totalCompleted.toLocaleString(locale)}
            </span>
          </div>
          <div className="v2-statistics-pill">
            <span className="v2-statistics-pill-label">
              {t("statisticsPage.activeDays")}
            </span>
            <span className="v2-statistics-pill-val">
              {heatmapModel.activeDays.toLocaleString(locale)}
            </span>
          </div>
          <div className="v2-statistics-pill">
            <span className="v2-statistics-pill-label">
              {t("statisticsPage.highestDaily")}
            </span>
            <span className="v2-statistics-pill-val">
              {(heatmapModel.maxCount || 0).toLocaleString(locale)}
            </span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid Region with Weekdays column and Month Headers */}
      <div
        className="v2-statistics-heatmap-container"
        tabIndex={0}
        role="region"
        aria-label={t("statisticsPage.activityHeading")}
      >
        <div className="v2-statistics-heat-wrapper">
          {/* Weekday labels column */}
          <div className="v2-statistics-heat-weekdays" aria-hidden="true">
            <span className="v2-statistics-heat-month-spacer" />
            <div className="v2-statistics-heat-weekdays-list">
              {weekdayLabels.map((day, idx) => (
                <span key={idx} className="v2-statistics-weekday-label">
                  {day}
                </span>
              ))}
            </div>
          </div>

          {/* Weeks columns */}
          <div className="v2-statistics-heat-weeks">
            {heatmapModel.weeks.map((week: HeatmapCell[], colIdx: number) => {
              const monthText = monthsMap.get(colIdx) || "";

              return (
                <div key={colIdx} className="v2-statistics-heat-column">
                  <span className="v2-statistics-heat-month-label">
                    {monthText}
                  </span>
                  {week.map((cell: HeatmapCell) => {
                    if (!cell.isInRange || !cell.dateKey) {
                      return (
                        <button
                          key={`pad-${colIdx}-${cell.weekdayIndex}`}
                          type="button"
                          disabled
                          aria-hidden="true"
                          tabIndex={-1}
                          className="v2-statistics-heatmap-cell v2-statistics-cell-disabled"
                        />
                      );
                    }

                    const cellDateKey = cell.dateKey;
                    const isSelected = selectedDateKey === cellDateKey;
                    const formattedDate = formatUtcDateLabel(cellDateKey, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const cellAriaLabel = `${cellDateKey} (${formattedDate}): ${cell.count} ${t("completed")}`;

                    return (
                      <button
                        key={cellDateKey}
                        ref={(el) => {
                          cellRefs.current[cellDateKey] = el;
                        }}
                        type="button"
                        onClick={() => handleDayClick(cellDateKey)}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        onFocus={() => setHoveredCell(cell)}
                        onBlur={() => setHoveredCell(null)}
                        aria-pressed={isSelected}
                        aria-label={cellAriaLabel}
                        title={cellAriaLabel}
                        className={`v2-statistics-heatmap-cell v2-statistics-level-${cell.level}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Heatmap Footer with Hover/Range status and Intensity Legend */}
      <div className="v2-statistics-heatmap-footer">
        <div className="v2-statistics-heatmap-status">
          <Calendar
            size={14}
            className="shrink-0 text-[var(--v2-accent)]"
            aria-hidden="true"
          />
          <span>
            {hoveredCell && hoveredCell.dateKey
              ? t("statisticsPage.tasksCompletedOnDay", {
                  count: hoveredCell.count,
                  date: formatUtcDateLabel(hoveredCell.dateKey, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                })
              : `${formattedRangeStart} – ${formattedRangeEnd}`}
          </span>
        </div>

        <div
          className="v2-statistics-intensity-legend"
          aria-label={t("statisticsPage.activityLegend")}
        >
          <span className="v2-statistics-legend-text">
            {t("statisticsPage.less")}
          </span>
          <div className="v2-statistics-legend-cells">
            <span className="v2-statistics-legend-cell v2-statistics-level-0 pointer-events-none" />
            <span className="v2-statistics-legend-cell v2-statistics-level-1 pointer-events-none" />
            <span className="v2-statistics-legend-cell v2-statistics-level-2 pointer-events-none" />
            <span className="v2-statistics-legend-cell v2-statistics-level-3 pointer-events-none" />
            <span className="v2-statistics-legend-cell v2-statistics-level-4 pointer-events-none" />
          </div>
          <span className="v2-statistics-legend-text">
            {t("statisticsPage.more")}
          </span>
        </div>
      </div>

      {/* Selected Day Details Panel */}
      {selectedDateKey && (
        <div
          className="v2-statistics-day-details"
          role="region"
          aria-live="polite"
          aria-label={t("statisticsPage.dayDetails", {
            date: formattedSelectedDate,
          })}
        >
          <div className="v2-statistics-day-details-header">
            <h3 className="v2-statistics-day-details-title">
              {t("statisticsPage.dayDetails", { date: formattedSelectedDate })}
            </h3>
            <button
              type="button"
              onClick={handleCloseDetails}
              aria-label={t("statisticsPage.closeDetails")}
              className="v2-statistics-close-btn inline-flex items-center gap-1"
            >
              <X size={14} aria-hidden="true" />
              <span>{t("close")}</span>
            </button>
          </div>

          {activityQuery.isLoading && (
            <div
              role="status"
              aria-live="polite"
              className="py-4 text-center text-xs text-[var(--v2-muted)]"
            >
              {t("statisticsPage.loadingDetails")}
            </div>
          )}

          {activityQuery.isError && (
            <div className="v2-statistics-alert py-2 text-xs" role="alert">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} aria-hidden="true" />
                <span>
                  {getApiErrorMessage(
                    activityQuery.error,
                    t("statisticsPage.errorDetails"),
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void activityQuery.refetch()}
                disabled={activityQuery.isFetching}
                className="v2-statistics-link cursor-pointer text-xs"
              >
                <RefreshCw
                  size={12}
                  className={activityQuery.isFetching ? "animate-spin" : ""}
                  aria-hidden="true"
                />
                <span>{t("retry")}</span>
              </button>
            </div>
          )}

          {activityQuery.isSuccess && (
            <>
              {!activityQuery.data || activityQuery.data.length === 0 ? (
                <p className="py-2 text-xs text-[var(--v2-muted)]">
                  {t("statisticsPage.noTasksOnDay")}
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {activityQuery.data.map((task: Task) => {
                    const categoryName =
                      typeof task.categoryId === "object" &&
                      task.categoryId?.name
                        ? task.categoryId.name
                        : t("defaultCategory");
                    const projectName =
                      typeof task.projectId === "object" && task.projectId?.name
                        ? task.projectId.name
                        : t("noProject");

                    return (
                      <div
                        key={task._id || task.id}
                        className="v2-statistics-task-row"
                      >
                        <span className="v2-statistics-task-title">
                          {task.title || t("statisticsPage.untitledTask")}
                        </span>
                        <div className="v2-statistics-task-tags">
                          <span className="rounded bg-[var(--v2-accent)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--v2-accent)]">
                            {categoryName}
                          </span>
                          <span className="rounded bg-[var(--v2-muted)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--v2-muted)]">
                            {projectName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </GlassPanel>
  );
}
