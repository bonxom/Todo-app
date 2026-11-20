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
  formatMonthLabel,
  formatWeekLabel,
  getDateKey,
  isSameDay,
  startOfDay,
} from "./calendarUtils";
import { buildMonthDays, buildWeekDays } from "../api/calendarRanges";
import { useSettingsStore } from "@/stores/useSettingsStore";

const SUNDAY_WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONDAY_WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const weekStartsOn = useSettingsStore(
    (state) => state.workspace.weekStartsOn,
  );
  const weekDayHeaders =
    weekStartsOn === "monday" ? MONDAY_WEEK_DAYS : SUNDAY_WEEK_DAYS;
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
      ? buildWeekDays(currentDate, weekStartsOn)
      : buildMonthDays(currentDate, weekStartsOn);

  const today = startOfDay(new Date());
  const heading =
    viewMode === "week"
      ? formatWeekLabel(currentDate)
      : formatMonthLabel(currentDate);

  return (
    <div
      className="ui-section-card calendar-board [scroll-margin-top:80px] overflow-hidden
        [@media(max-width:650px)]:[&[data-view=month]_[data-cal-task-list]_>_span]:text-[8px]
        [@media(max-width:650px)]:[&[data-view=month]_[data-cal-task-list]_>_span]:px-[0]"
      data-view={viewMode}
      data-week-mode={weekMode}
    >
      <div
        className="calendar-board-toolbar flex items-center justify-between [&_p]:text-[10px] [&_p]:uppercase
        [&_p]:[letter-spacing:0.1em] [@media(max-width:650px)]:[&_>_div:last-child_>_div]:flex-row
        [&_.ui-btn-secondary]:whitespace-nowrap [&_.calendar-time-detail_>_span]:absolute
        [&_.calendar-time-detail_>_span]:h-[1px] [&_.calendar-time-detail_>_span]:overflow-hidden
        [&_.calendar-time-detail_>_span]:[clip-path:inset(50%)]"
      >
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
          <h2
            className="calendar-range-title text-[21px] [letter-spacing:-0.025em] [font-weight:600] mt-[5px] [@media(max-width:650px)]:text-[20px]"
            aria-live="polite"
          >
            {heading}
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <div className="calendar-toolbar-controls flex items-center justify-end flex-wrap gap-[10px] [@media(max-width:650px)]:justify-start">
            {viewMode === "week" && (
              <div className="calendar-week-controls flex items-center">
                <div
                  className="calendar-week-modes inline-flex p-[3px] gap-[3px] [background:var(--color-surface-muted)]
                    rounded-[var(--radius-md)] [&_button]:inline-flex [&_button]:items-center [&_button]:justify-center
                    [&_button]:gap-[7px] [&_button]:p-[6px_13px] [&_button]:rounded-[calc(var(--radius-md)_-_2px)]
                    [&_button]:cursor-pointer [&_button[aria-pressed=true]]:[background:var(--color-surface)]
                    [&_button[aria-pressed=true]]:[box-shadow:var(--shadow-xs)]"
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
                  <label
                    className="calendar-time-detail flex items-center gap-[9px] text-[11px] text-[var(--color-text-muted)]
                    [&_select]:p-[6px_9px] [&_select]:[border:1px_solid_var(--color-line)] [&_select]:rounded-[var(--radius-md)]
                    [&_select]:[background:var(--color-surface)] [&_.ui-custom-select]:min-w-[88px]"
                  >
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
                className="ui-icon-button items-center justify-center
                  [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
                  [&:hover]:[transform:translateY(-1px)] ui-focus-ring"
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
                className="ui-icon-button items-center justify-center
                  [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
                  [&:hover]:[transform:translateY(-1px)] ui-focus-ring"
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
          className="calendar-grid-scroll overflow-x-auto ui-focus-ring"
          ref={gridRef}
          tabIndex={0}
          role="region"
          aria-label={t("calendarDates")}
        >
          <div
            className="calendar-weekdays [background:var(--color-surface-muted)] [border-block:1px_solid_var(--color-line)]
            [&_>_div]:[font-weight:600] [&_>_div]:uppercase [&_>_div]:[letter-spacing:0.07em]"
            data-cal-header-grid
          >
            {weekDayHeaders.map((day) => (
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

      <footer
        className="calendar-board-footer flex justify-between gap-[15px] p-[13px_20px] text-[10px] text-[var(--color-text-muted)]
        [&_>_span:first-child]:flex [&_>_span:first-child]:gap-[7px] [&_>_span:first-child]:whitespace-nowrap
        [&_i]:w-[7px] [&_i]:h-[7px] [&_i]:rounded-[50%] [&_i]:[background:var(--color-accent)] [&_b]:w-[9px]
        [&_b]:h-[9px] [&_b]:rounded-[2px] [&_b]:[border:1px_solid_var(--color-accent)]
        [&_b]:[background:var(--color-accent-soft)] [&_b]:ml-[10px]
        [@media(max-width:650px)]:p-[12px] [@media(max-width:650px)]:text-[9px]
        [@media(max-width:650px)]:[&_>_span:last-child]:max-w-[160px]
        [@media(max-width:650px)]:[&_>_span:last-child]:text-right"
      >
        <span>
          <i /> {t("today")}
          <b /> {t("selectedDay")}
        </span>
        <span>
          <span className="calendar-board-help">
            {t("chooseADayToSeeItsTasksDragTasksToReschedule")}
          </span>
          {viewMode === "week" && (
            <span className="calendar-week-mobile-hint [display:none] [@media(max-width:650px)]:inline">
              {t("calendarSwipeWeek")}
            </span>
          )}
        </span>
      </footer>
    </div>
  );
};

export default CalendarGrid;
