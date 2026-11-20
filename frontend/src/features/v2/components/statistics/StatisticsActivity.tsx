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
    <GlassPanel className="v2-workspace-panel overflow-hidden v2-statistics-activity-card flex flex-col gap-[1.25rem] min-w-[0]">
      {/* Top Header with title on left and metric pills on right */}
      <div className="v2-statistics-activity-header flex items-start justify-between gap-[1rem] flex-wrap">
        <div className="v2-statistics-card-header flex flex-col gap-[0.25rem]">
          <h2 className="v2-statistics-card-title [font-family:var(--v2-font-heading,inherit)] text-[1.1875rem] [font-weight:700] text-[var(--v2-ink)] [letter-spacing:-0.015em]">
            {t("statisticsPage.activityHeading")}
          </h2>
          <span className="v2-statistics-card-subtitle text-[0.8125rem] text-[var(--v2-muted)]">
            {t("statisticsPage.activitySubheading")}
          </span>
        </div>

        <div className="v2-statistics-activity-pills flex gap-[0.5rem] flex-wrap">
          <div
            className="v2-statistics-pill flex items-center gap-[0.5rem] p-[0.375rem_0.75rem] rounded-[9999px]
            [background:var(--v2-input-fill)] [border:1px_solid_var(--v2-border)] [backdrop-filter:blur(8px)]"
          >
            <span className="v2-statistics-pill-label text-[0.6875rem] [font-weight:600] uppercase [letter-spacing:0.03em] text-[var(--v2-muted)]">
              {t("completed")}
            </span>
            <span className="v2-statistics-pill-val text-[0.875rem] [font-weight:700] text-[var(--v2-ink)] [font-variant-numeric:tabular-nums]">
              {heatmapModel.totalCompleted.toLocaleString(locale)}
            </span>
          </div>
          <div
            className="v2-statistics-pill flex items-center gap-[0.5rem] p-[0.375rem_0.75rem] rounded-[9999px]
            [background:var(--v2-input-fill)] [border:1px_solid_var(--v2-border)] [backdrop-filter:blur(8px)]"
          >
            <span className="v2-statistics-pill-label text-[0.6875rem] [font-weight:600] uppercase [letter-spacing:0.03em] text-[var(--v2-muted)]">
              {t("statisticsPage.activeDays")}
            </span>
            <span className="v2-statistics-pill-val text-[0.875rem] [font-weight:700] text-[var(--v2-ink)] [font-variant-numeric:tabular-nums]">
              {heatmapModel.activeDays.toLocaleString(locale)}
            </span>
          </div>
          <div
            className="v2-statistics-pill flex items-center gap-[0.5rem] p-[0.375rem_0.75rem] rounded-[9999px]
            [background:var(--v2-input-fill)] [border:1px_solid_var(--v2-border)] [backdrop-filter:blur(8px)]"
          >
            <span className="v2-statistics-pill-label text-[0.6875rem] [font-weight:600] uppercase [letter-spacing:0.03em] text-[var(--v2-muted)]">
              {t("statisticsPage.highestDaily")}
            </span>
            <span className="v2-statistics-pill-val text-[0.875rem] [font-weight:700] text-[var(--v2-ink)] [font-variant-numeric:tabular-nums]">
              {(heatmapModel.maxCount || 0).toLocaleString(locale)}
            </span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid Region with Weekdays column and Month Headers */}
      <div
        className="v2-statistics-heatmap-container w-full max-w-full overflow-x-auto p-[0.5rem_0.25rem_0.75rem] min-w-[0] [scrollbar-width:thin]"
        tabIndex={0}
        role="region"
        aria-label={t("statisticsPage.activityHeading")}
      >
        <div className="v2-statistics-heat-wrapper flex gap-[8px] min-w-[720px] w-full items-stretch">
          {/* Weekday labels column */}
          <div
            className="v2-statistics-heat-weekdays w-[24px] shrink-0 flex flex-col [user-select:none]"
            aria-hidden="true"
          >
            <span className="v2-statistics-heat-month-spacer h-[20px] shrink-0 mb-[3.5px]" />
            <div className="v2-statistics-heat-weekdays-list flex-1 grid grid-rows-[repeat(7,1fr)] gap-[3.5px]">
              {weekdayLabels.map((day, idx) => (
                <span
                  key={idx}
                  className="v2-statistics-weekday-label flex items-center justify-end pr-[4px] text-[9px] [font-weight:600] text-[var(--v2-muted)] [line-height:1]"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>

          {/* Weeks columns */}
          <div className="v2-statistics-heat-weeks flex gap-[3.5px] flex-1 w-full">
            {heatmapModel.weeks.map((week: HeatmapCell[], colIdx: number) => {
              const monthText = monthsMap.get(colIdx) || "";

              return (
                <div
                  key={colIdx}
                  className="v2-statistics-heat-column flex-1 min-w-[9px] flex flex-col gap-[3.5px]"
                >
                  <span className="v2-statistics-heat-month-label h-[20px] [line-height:20px] text-[9px] [font-weight:600] text-[var(--v2-muted)] whitespace-nowrap [user-select:none] shrink-0">
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
                          className="v2-statistics-heatmap-cell block w-full aspect-[1_/_1] h-auto rounded-[3px]
                            [border:1px_solid_color-mix(in_srgb,var(--v2-accent,#14675f)_14%,transparent)] cursor-pointer
                            [background:var(--v2-input-fill)] p-[0] v2-statistics-cell-disabled"
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
                        className={`v2-statistics-heatmap-cell block w-full aspect-[1_/_1] h-auto rounded-[3px] [border:1px_solid_color-mix(in_srgb,var(--v2-accent,#14675f)_14%,transparent)] cursor-pointer [background:var(--v2-input-fill)] p-[0] v2-statistics-level-${cell.level}`}
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
      <div className="v2-statistics-heatmap-footer flex items-center justify-between gap-[1rem] flex-wrap pt-[0.75rem] [border-top:1px_solid_var(--v2-border)]">
        <div className="v2-statistics-heatmap-status flex items-center gap-[0.5rem] text-[0.8125rem] text-[var(--v2-muted)] [font-variant-numeric:tabular-nums] min-h-[1.5rem]">
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
          className="v2-statistics-intensity-legend flex items-center gap-[0.375rem] text-[0.75rem] text-[var(--v2-muted)]"
          aria-label={t("statisticsPage.activityLegend")}
        >
          <span className="v2-statistics-legend-text text-[0.6875rem] [font-weight:600] text-[var(--v2-muted)] uppercase [letter-spacing:0.03em]">
            {t("statisticsPage.less")}
          </span>
          <div className="v2-statistics-legend-cells flex gap-[3.5px] items-center">
            <span className="v2-statistics-legend-cell w-[12px] h-[12px] rounded-[3px] shrink-0 inline-block v2-statistics-level-0 pointer-events-none" />
            <span className="v2-statistics-legend-cell w-[12px] h-[12px] rounded-[3px] shrink-0 inline-block v2-statistics-level-1 pointer-events-none" />
            <span className="v2-statistics-legend-cell w-[12px] h-[12px] rounded-[3px] shrink-0 inline-block v2-statistics-level-2 pointer-events-none" />
            <span className="v2-statistics-legend-cell w-[12px] h-[12px] rounded-[3px] shrink-0 inline-block v2-statistics-level-3 pointer-events-none" />
            <span className="v2-statistics-legend-cell w-[12px] h-[12px] rounded-[3px] shrink-0 inline-block v2-statistics-level-4 pointer-events-none" />
          </div>
          <span className="v2-statistics-legend-text text-[0.6875rem] [font-weight:600] text-[var(--v2-muted)] uppercase [letter-spacing:0.03em]">
            {t("statisticsPage.more")}
          </span>
        </div>
      </div>

      {/* Selected Day Details Panel */}
      {selectedDateKey && (
        <div
          className="v2-statistics-day-details p-[1.25rem_1.5rem] rounded-[0.875rem] [background:var(--v2-input-fill)]
            [border:1px_solid_var(--v2-border)] [backdrop-filter:blur(12px)] flex flex-col gap-[1rem]
            animate-[v2-fade-in_0.2s_ease-out] [@media(prefers-reduced-motion:reduce)]:animate-none"
          role="region"
          aria-live="polite"
          aria-label={t("statisticsPage.dayDetails", {
            date: formattedSelectedDate,
          })}
        >
          <div className="v2-statistics-day-details-header flex items-center justify-between gap-[1rem] flex-wrap">
            <h3 className="v2-statistics-day-details-title text-[0.9375rem] [font-weight:700] text-[var(--v2-ink)] wrap-anywhere min-w-[0] max-w-full">
              {t("statisticsPage.dayDetails", { date: formattedSelectedDate })}
            </h3>
            <button
              type="button"
              onClick={handleCloseDetails}
              aria-label={t("statisticsPage.closeDetails")}
              className="v2-statistics-close-btn p-[0.25rem_0.625rem] rounded-[0.375rem] [border:1px_solid_var(--v2-border)] cursor-pointer [transition:all_0.15s_ease] inline-flex items-center gap-1"
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
            <div
              className="v2-statistics-alert rounded-[0.75rem] flex items-center justify-between gap-[1rem] text-[0.875rem] py-2 text-xs"
              role="alert"
            >
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
                className="v2-statistics-link inline-flex items-center gap-[0.5rem] p-[0.5rem_1.125rem] [background:var(--v2-input-fill)]
                  [border:1px_solid_var(--v2-border)] rounded-[9999px] [backdrop-filter:blur(12px)]
                  [-webkit-backdrop-filter:blur(12px)] [text-decoration:none] [&:hover]:[background:var(--v2-accent,#14675f)]
                  [&:hover]:border-[var(--v2-accent,#14675f)] [&:focus-visible]:[outline:2px_solid_var(--v2-accent)]
                  [&:focus-visible]:outline-offset-[2px] cursor-pointer text-xs"
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
                        className="v2-statistics-task-row flex items-center justify-between gap-[0.75rem] p-[0.625rem_0.875rem] rounded-[0.625rem] text-[0.8125rem] flex-wrap"
                      >
                        <span className="v2-statistics-task-title [font-weight:600] text-[var(--v2-ink)] min-w-[0] overflow-hidden text-ellipsis wrap-anywhere flex-[1_1_16rem]">
                          {task.title || t("statisticsPage.untitledTask")}
                        </span>
                        <div className="v2-statistics-task-tags flex items-center gap-[0.5rem] text-[0.75rem] text-[var(--v2-muted)] flex-wrap min-w-[0] [&_>_span]:wrap-anywhere [&_>_span]:min-w-[0] [&_>_span]:max-w-full">
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
