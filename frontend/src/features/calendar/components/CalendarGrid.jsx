import { workspaceKey } from "@/features/tasks/utils/workspaceTranslation";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  List,
  Clock3,
} from "lucide-react";
import CustomSelect from "@/shared/components/CustomSelect";
import DayCell from "./DayCell";
import WeekTimeline from "./WeekTimeline";
import {
  buildMonthDays,
  buildWeekDays,
  formatMonthLabel,
  formatWeekLabel,
  getDateKey,
  isSameDay,
  startOfDay,
} from "./calendarUtils";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CalendarGrid = ({
  currentDate,
  selectedDate,
  onDateSelect,
  onNavigate,
  onResetToToday,
  tasksByDate,
  onTaskUpdated,
  onTaskDueDateChange,
  onTaskDatesChange,
  onTaskCopy,
  isRangeLoading = false,
  viewMode = "month",
  showViewModeToggle = false,
  onViewModeChange,
  actions,
}) => {
  const { t } = useTranslation("workspace");
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [weekMode, setWeekMode] = useState("detailed");
  const timelineViewport = useRef({ minute: 480 });

  const gridRef = useRef(null);
  useEffect(() => {
    const grid = gridRef.current;
    const selected = grid?.querySelector('[aria-pressed="true"]');
    if (grid && selected && viewMode === "week") {
      grid.scrollLeft +=
        selected.getBoundingClientRect().left -
        grid.getBoundingClientRect().left -
        (grid.clientWidth - selected.clientWidth) / 2;
    }
  }, [selectedDate, viewMode, weekMode]);

  const calendarDays =
    viewMode === "week"
      ? buildWeekDays(currentDate)
      : buildMonthDays(currentDate);

  const today = startOfDay(new Date());
  const heading =
    viewMode === "week"
      ? formatWeekLabel(currentDate)
      : formatMonthLabel(currentDate);

  return (
    <div
      className="ui-section-card calendar-board"
      data-view={viewMode}
      data-week-mode={weekMode}
    >
      <div className="calendar-board-toolbar">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--color-accent)]">
              {viewMode === "week" ? t("weekView") : t("monthView")}
            </p>
            {isRangeLoading ? (
              <span
                role="status"
                aria-label={t("loadingCalendarRange")}
                className="inline-flex text-[var(--color-text-muted)]"
              >
                <LoaderCircle
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              </span>
            ) : null}
          </div>
          <h2 className="calendar-range-title" aria-live="polite">
            {heading}
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <div className="calendar-toolbar-controls">
            {viewMode === "week" && (
              <div className="calendar-week-controls">
                <div
                  className="calendar-week-modes"
                  role="group"
                  aria-label={t("weekLayout")}
                >
                  <button
                    type="button"
                    className="ui-focus-ring"
                    aria-pressed={weekMode === "detailed"}
                    onClick={() => setWeekMode("detailed")}
                  >
                    <Clock3 size={15} aria-hidden="true" />
                    {t("weekDetailed")}
                  </button>
                  <button
                    type="button"
                    className="ui-focus-ring"
                    aria-pressed={weekMode === "compact"}
                    onClick={() => setWeekMode("compact")}
                  >
                    <List size={15} aria-hidden="true" />
                    {t("weekCompact")}
                  </button>
                </div>
                {weekMode === "detailed" && (
                  <label className="calendar-time-detail">
                    <span>{t("timeDetail")}</span>
                    <CustomSelect
                      className="ui-focus-ring calendar-interval-trigger"
                      aria-label={t("timeDetail")}
                      value={String(intervalMinutes)}
                      onChange={(event) =>
                        setIntervalMinutes(Number(event.target.value))
                      }
                    >
                      {[15, 30, 60].map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {t("calendarMinutes", { count: minutes })}
                        </option>
                      ))}
                    </CustomSelect>
                  </label>
                )}
              </div>
            )}

            {showViewModeToggle && (
              <div className="inline-flex rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-1">
                <button
                  type="button"
                  onClick={() => onViewModeChange?.("month")}
                  aria-pressed={viewMode === "month"}
                  className={`ui-focus-ring rounded-[calc(var(--radius-md)-2px)] px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${
                    viewMode === "month"
                      ? "bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[var(--shadow-xs)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {t("month")}
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange?.("week")}
                  aria-pressed={viewMode === "week"}
                  className={`ui-focus-ring rounded-[calc(var(--radius-md)-2px)] px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${
                    viewMode === "week"
                      ? "bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[var(--shadow-xs)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {t("week")}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onNavigate(-1)}
                className="ui-icon-button ui-focus-ring"
                aria-label={
                  viewMode === "week" ? t("previousWeek") : t("previousMonth")
                }
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onResetToToday}
                className="ui-btn-secondary ui-focus-ring"
              >
                {t("today")}
              </button>
              <button
                type="button"
                onClick={() => onNavigate(1)}
                className="ui-icon-button ui-focus-ring"
                aria-label={
                  viewMode === "week" ? t("nextWeek") : t("nextMonth")
                }
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {actions ? (
            <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>
          ) : null}
        </div>
      </div>

      {viewMode === "week" && weekMode === "detailed" ? (
        <WeekTimeline
          currentDate={currentDate}
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          tasksByDate={tasksByDate}
          onTaskDueDateChange={onTaskDueDateChange}
          onTaskCopy={onTaskCopy}
          onTaskDatesChange={onTaskDatesChange}
          intervalMinutes={intervalMinutes}
          viewportRef={timelineViewport}
          onTaskUpdated={onTaskUpdated}
        />
      ) : (
        <div
          className="calendar-grid-scroll ui-focus-ring"
          ref={gridRef}
          tabIndex={0}
          role="region"
          aria-label={t("calendarDates")}
        >
          <div className="calendar-weekdays" data-cal-header-grid>
            {WEEK_DAYS.map((day) => (
              <div
                key={t(workspaceKey(day), { defaultValue: day })}
                className="py-2 text-center text-xs font-semibold text-[var(--color-text-muted)] sm:text-sm"
              >
                {t(workspaceKey(day), { defaultValue: day })}
              </div>
            ))}
          </div>

          <div className="calendar-days" data-cal-day-grid>
            {calendarDays.map(({ date, isCurrentMonth }, index) => {
              const dateKey = getDateKey(date);
              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, selectedDate);
              const tasks = tasksByDate[dateKey] || [];

              return (
                <DayCell
                  key={`${dateKey}-${index}`}
                  day={date}
                  isToday={isToday}
                  isSelected={isSelected}
                  isCurrentMonth={isCurrentMonth}
                  tasks={tasks}
                  onClick={onDateSelect}
                  onTaskUpdated={onTaskUpdated}
                  onTaskDueDateChange={onTaskDueDateChange}
                  onTaskCopy={onTaskCopy}
                  viewMode={viewMode}
                />
              );
            })}
          </div>
        </div>
      )}

      <footer className="calendar-board-footer">
        <span>
          <i /> {t("today")}
          <b /> {t("selectedDay")}
        </span>
        <span>
          <span className="calendar-board-help">
            {t("chooseADayToSeeItsTasksDragTasksToReschedule")}
          </span>
          {viewMode === "week" && (
            <span className="calendar-week-mobile-hint">
              {t("calendarSwipeWeek")}
            </span>
          )}
        </span>
      </footer>
    </div>
  );
};

export default CalendarGrid;
