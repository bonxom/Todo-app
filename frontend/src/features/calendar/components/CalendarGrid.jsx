import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import DayCell from "./DayCell";
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
  onTaskCopy,
  isRangeLoading = false,
  viewMode = "month",
  showViewModeToggle = false,
  onViewModeChange,
  actions,
}) => {
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
  }, [selectedDate, viewMode]);

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
    <div className="ui-section-card calendar-board" data-view={viewMode}>
      <div className="calendar-board-toolbar">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--color-accent)]">
              {viewMode === "week" ? "Week view" : "Month view"}
            </p>
            {isRangeLoading ? (
              <span
                role="status"
                aria-label="Loading calendar range"
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                  Month
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
                  Week
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onNavigate(-1)}
                className="ui-icon-button ui-focus-ring"
                aria-label={
                  viewMode === "week" ? "Previous week" : "Previous month"
                }
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onResetToToday}
                className="ui-btn-secondary ui-focus-ring"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => onNavigate(1)}
                className="ui-icon-button ui-focus-ring"
                aria-label={viewMode === "week" ? "Next week" : "Next month"}
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

      <div
        className="calendar-grid-scroll ui-focus-ring"
        ref={gridRef}
        tabIndex={0}
        role="region"
        aria-label="Calendar dates"
      >
        <div className="calendar-weekdays" data-cal-header-grid>
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold text-[var(--color-text-muted)] sm:text-sm"
            >
              {day}
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
      <footer className="calendar-board-footer">
        <span>
          <i /> Today <b /> Selected day
        </span>
        <span>Choose a day to see its tasks · Drag tasks to reschedule</span>
      </footer>
    </div>
  );
};

export default CalendarGrid;
