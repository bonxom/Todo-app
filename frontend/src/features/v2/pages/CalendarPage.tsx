import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useCalendarTasksQuery } from "@/features/tasks/api/taskQueries";
import { useCalendarMutations } from "@/features/calendar/api/useCalendarMutations";
import {
  addDays,
  addMonths,
  buildMonthDays,
  buildWeekDays,
  getBufferedCalendarRange,
  getVisibleCalendarRange,
  startOfDay,
  taskHasDueDateInRange,
  type CalendarViewMode,
} from "@/features/calendar/api/calendarRanges";
import { getLocale } from "@/shared/i18n";
import { getApiErrorMessage } from "@/shared/services/apiError";
import { toISOStringLocal } from "@/shared/utils/dateTime";
import type { Task } from "@/shared/types/domain";
import TaskDetailsDialog from "../components/TaskDetailsDialog";
import TaskEditor from "../components/TaskEditor";
import WeekDetailGrid from "../components/WeekDetailGrid";
import TaskStatusActions from "../components/TaskStatusActions";

const dayKey = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const dayTasks = (map: Map<string, Task[]>, date: Date): Task[] =>
  map.get(dayKey(date)) ?? [];

export default function CalendarPage() {
  const { t } = useTranslation("v2");
  const [today] = useState(() => startOfDay(new Date()));
  const [currentDate, setCurrentDate] = useState(today);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [weekLayout, setWeekLayout] = useState<"detail" | "agenda">("detail");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [dropCellKey, setDropCellKey] = useState<string | null>(null);

  const bufferedRange = useMemo(
    () => getBufferedCalendarRange(currentDate, viewMode),
    [currentDate, viewMode],
  );
  const visibleRange = useMemo(
    () => getVisibleCalendarRange(currentDate, viewMode),
    [currentDate, viewMode],
  );

  const calendarMutations = useCalendarMutations();

  const tasksQuery = useCalendarTasksQuery({
    startDate: bufferedRange.startIso,
    endDate: bufferedRange.endIso,
  });

  const renderedTasks = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    return tasks.filter((task) => taskHasDueDateInRange(task, visibleRange));
  }, [tasksQuery.data, visibleRange]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of renderedTasks) {
      if (!task.dueDate) continue;
      const key = dayKey(task.dueDate);
      const list = map.get(key);
      if (list) list.push(task);
      else map.set(key, [task]);
    }
    for (const list of map.values()) {
      list.sort(
        (left, right) =>
          new Date(left.dueDate ?? 0).getTime() -
          new Date(right.dueDate ?? 0).getTime(),
      );
    }
    return map;
  }, [renderedTasks]);

  const weekDays = useMemo(() => buildWeekDays(currentDate), [currentDate]);
  const monthDays = useMemo(() => buildMonthDays(currentDate), [currentDate]);
  const monthRows = useMemo(() => {
    const rows: Array<typeof monthDays> = [];
    for (let index = 0; index < monthDays.length; index += 7) {
      rows.push(monthDays.slice(index, index + 7));
    }
    return rows;
  }, [monthDays]);

  const locale = getLocale();
  const fullDateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "full" }),
    [locale],
  );
  const timeFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { timeStyle: "short" }),
    [locale],
  );
  const weekdayFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short" }),
    [locale],
  );

  const periodLabel = useMemo(() => {
    if (viewMode === "month") {
      return new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }).format(currentDate);
    }
    const short = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    });
    const first = weekDays[0]?.date ?? currentDate;
    const last = weekDays[weekDays.length - 1]?.date ?? currentDate;
    return `${short.format(first)} – ${short.format(last)}`;
  }, [currentDate, locale, viewMode, weekDays]);

  const errorMessage = tasksQuery.isError
    ? getApiErrorMessage(tasksQuery.error, t("errorLoadingTasks"))
    : "";

  const move = (direction: -1 | 1) => {
    setSelectedDate(null);
    setCurrentDate((date) =>
      viewMode === "month"
        ? addMonths(date, direction)
        : addDays(date, direction * 7),
    );
  };

  const jumpToToday = () => {
    setSelectedDate(null);
    setCurrentDate(today);
  };

  const openDay = (date: Date) => setSelectedDate(date);

  const handleMoveTask = async (
    taskId: string,
    target: Date,
    minute: number | null,
  ) => {
    const task = renderedTasks.find((candidate) => candidate._id === taskId);
    if (!task) return;
    const source = task.dueDate ? new Date(task.dueDate) : null;
    const targetMinute =
      minute ?? (source ? source.getHours() * 60 + source.getMinutes() : 0);
    const next = new Date(target);
    next.setHours(Math.floor(targetMinute / 60), targetMinute % 60, 0, 0);

    setMoveError(null);
    try {
      await calendarMutations.changeTaskDueDate(task, toISOStringLocal(next));
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : t("errorMovingTask"));
    }
  };
  const selectedTasks = selectedDate ? dayTasks(tasksByDay, selectedDate) : [];

  return (
    <div
      className="v2-calendar flex flex-col gap-[18px]"
      data-testid="v2-calendar-page"
    >
      <h1 className="sr-only">{t("calendar")}</h1>
      <header className="v2-page-actions [&.v2-skills-header]:items-center [&.v2-skills-header]:justify-between [&.v2-skills-header]:flex-wrap [&.v2-skills-header]:gap-[12px] flex justify-end">
        <div className="v2-agents-heading-actions flex gap-[10px] flex-wrap">
          <div
            className="v2-calendar-nav inline-flex items-center gap-[4px] p-[4px] [border:1px_solid_var(--v2-border)] rounded-[var(--v2-radius-pill)]"
            role="group"
            aria-label={t("calendar")}
          >
            <button
              type="button"
              className="v2-btn v2-calendar-nav-btn"
              onClick={() => move(-1)}
              aria-label={t("previousPeriod")}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="v2-btn v2-calendar-today"
              onClick={jumpToToday}
            >
              {t("today")}
            </button>
            <button
              type="button"
              className="v2-btn v2-calendar-nav-btn"
              onClick={() => move(1)}
              aria-label={t("nextPeriod")}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div
            className="v2-agent-tabs inline-flex gap-[5px] p-[5px] [border:1px_solid_var(--v2-border)] rounded-[var(--v2-radius-pill)] v2-calendar-views"
            role="group"
            aria-label={t("calendarViewLabel")}
          >
            <button
              type="button"
              className="v2-agent-tab inline-flex items-center gap-[7px] min-h-[36px] p-[7px_14px] rounded-[var(--v2-radius-pill)]
                [transition:color_140ms_ease,background_140ms_ease] [&[data-active=true]]:[background:var(--v2-input-fill)]
                [&[data-active=true]]:[box-shadow:var(--v2-shadow-sm)]
                [@media(prefers-reduced-motion:reduce)]:[transition:none] [@media(max-width:899px)]:flex-1
                [@media(max-width:899px)]:justify-center"
              data-active={viewMode === "week"}
              aria-pressed={viewMode === "week"}
              onClick={() => setViewMode("week")}
            >
              {t("weekView")}
            </button>
            <button
              type="button"
              className="v2-agent-tab inline-flex items-center gap-[7px] min-h-[36px] p-[7px_14px] rounded-[var(--v2-radius-pill)]
                [transition:color_140ms_ease,background_140ms_ease] [&[data-active=true]]:[background:var(--v2-input-fill)]
                [&[data-active=true]]:[box-shadow:var(--v2-shadow-sm)]
                [@media(prefers-reduced-motion:reduce)]:[transition:none] [@media(max-width:899px)]:flex-1
                [@media(max-width:899px)]:justify-center"
              data-active={viewMode === "month"}
              aria-pressed={viewMode === "month"}
              onClick={() => setViewMode("month")}
            >
              {t("monthView")}
            </button>
          </div>
          <button
            type="button"
            className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.08)]"
            onClick={() => setCreating(true)}
          >
            <Plus size={16} aria-hidden="true" />
            <span>{t("newTask")}</span>
          </button>
        </div>
      </header>

      {moveError && (
        <p className="v2-form-error text-[13px]" role="alert">
          {moveError}
        </p>
      )}

      <section className="v2-agent-panel [border:1px_solid_var(--v2-glass-border)] rounded-[var(--v2-radius-card)] flex-col min-w-[0] min-h-[0] v2-calendar-panel gap-[14px]">
        <div
          className="v2-calendar-toolbar flex items-center justify-between gap-[12px] flex-wrap
          [&_h2]:[font-family:var(--v2-font-heading)] [&_h2]:text-[20px] [&_h2]:[font-weight:600]
          [&_h2]:[letter-spacing:-0.01em]"
        >
          <h2 aria-live="polite">{periodLabel}</h2>
          {viewMode === "week" && (
            <div
              className="v2-agent-tabs inline-flex gap-[5px] p-[5px] [border:1px_solid_var(--v2-border)] rounded-[var(--v2-radius-pill)] v2-calendar-week-layouts"
              role="group"
              aria-label={t("weekLayoutLabel")}
            >
              <button
                type="button"
                className="v2-agent-tab inline-flex items-center gap-[7px] min-h-[36px] p-[7px_14px] rounded-[var(--v2-radius-pill)]
                  [transition:color_140ms_ease,background_140ms_ease] [&[data-active=true]]:[background:var(--v2-input-fill)]
                  [&[data-active=true]]:[box-shadow:var(--v2-shadow-sm)]
                  [@media(prefers-reduced-motion:reduce)]:[transition:none] [@media(max-width:899px)]:flex-1
                  [@media(max-width:899px)]:justify-center"
                data-active={weekLayout === "detail"}
                aria-pressed={weekLayout === "detail"}
                onClick={() => setWeekLayout("detail")}
              >
                {t("weekDetail")}
              </button>
              <button
                type="button"
                className="v2-agent-tab inline-flex items-center gap-[7px] min-h-[36px] p-[7px_14px] rounded-[var(--v2-radius-pill)]
                  [transition:color_140ms_ease,background_140ms_ease] [&[data-active=true]]:[background:var(--v2-input-fill)]
                  [&[data-active=true]]:[box-shadow:var(--v2-shadow-sm)]
                  [@media(prefers-reduced-motion:reduce)]:[transition:none] [@media(max-width:899px)]:flex-1
                  [@media(max-width:899px)]:justify-center"
                data-active={weekLayout === "agenda"}
                aria-pressed={weekLayout === "agenda"}
                onClick={() => setWeekLayout("agenda")}
              >
                {t("weekAgenda")}
              </button>
            </div>
          )}
          <span className="v2-calendar-count inline-flex items-center gap-[6px] text-[var(--v2-muted)] text-[12px] [font-variant-numeric:tabular-nums]">
            <CalendarDays size={15} aria-hidden="true" />
            {renderedTasks.length} {t("tasks")}
          </span>
        </div>

        {tasksQuery.isLoading ? (
          <p
            className="v2-skills-status flex flex-col items-center gap-[12px] p-[36px_16px] text-[var(--v2-muted)] text-[13px] text-center [&_>_svg]:flex-[0_0_auto]"
            role="status"
          >
            {t("loadingCalendar")}
          </p>
        ) : errorMessage ? (
          <div
            className="v2-skills-status flex flex-col items-center gap-[12px] p-[36px_16px] text-[var(--v2-muted)] text-[13px] text-center [&_>_svg]:flex-[0_0_auto]"
            role="alert"
          >
            <p>{errorMessage}</p>
            <button
              type="button"
              className="v2-btn"
              onClick={() => void tasksQuery.refetch()}
            >
              {t("retry")}
            </button>
          </div>
        ) : viewMode === "month" ? (
          <div
            className="v2-calendar-month flex flex-col overflow-hidden [border:1px_solid_var(--v2-border)] rounded-[18px]"
            role="grid"
            aria-label={periodLabel}
          >
            <div
              className="v2-calendar-weekdays grid grid-cols-[repeat(7,minmax(0,1fr))] [background:var(--v2-input-fill)] [&_span]:[letter-spacing:0.08em] [&_span]:uppercase [&_span]:text-[var(--v2-muted)]"
              role="row"
            >
              {monthRows[0]?.map(({ date }) => (
                <span key={date.toISOString()} role="columnheader">
                  {weekdayFormat.format(date)}
                </span>
              ))}
            </div>
            {monthRows.map((row) => (
              <div
                className="v2-calendar-week grid grid-cols-[repeat(7,minmax(0,1fr))]"
                role="row"
                key={row[0]?.date.toISOString()}
              >
                {row.map(({ date, isCurrentMonth }) => {
                  const tasks = dayTasks(tasksByDay, date);
                  const isToday = dayKey(date) === dayKey(today);
                  return (
                    <div
                      className="v2-calendar-cell relative flex flex-col gap-[4px] [border-top:1px_solid_var(--v2-border)]
                        [&[data-outside=true]]:opacity-[0.55] [&[data-today=true]]:[background:var(--v2-input-fill)]
                        [&[data-today=true]]:[box-shadow:inset_0_0_0_1px_var(--v2-accent)] [&[data-has-tasks=true]::after]:w-[5px]
                        [&[data-has-tasks=true]::after]:h-[5px] [&[data-has-tasks=true]::after]:mt-auto
                        [&[data-has-tasks=true]::after]:rounded-[100%] [&[data-has-tasks=true]::after]:[background:var(--v2-accent)]
                        [@media(max-width:640px)]:items-center [@media(max-width:640px)]:[&[data-has-tasks=true]::after]:absolute
                        [@media(max-width:640px)]:[&[data-has-tasks=true]::after]:bottom-[8px]
                        [@media(max-width:640px)]:[&[data-has-tasks=true]::after]:pointer-events-none
                        [&[data-drop=true]]:[outline:1px_dashed_var(--v2-accent)] [&[data-drop=true]]:outline-offset-[-2px]
                        [&[data-drop=true]]:[background:var(--v2-shell-fill)]"
                      role="gridcell"
                      key={date.toISOString()}
                      data-outside={!isCurrentMonth}
                      data-today={isToday}
                      data-has-tasks={tasks.length > 0}
                      data-drop={dropCellKey === dayKey(date)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropCellKey(dayKey(date));
                      }}
                      onDragLeave={() => setDropCellKey(null)}
                      onDrop={(event) => {
                        event.preventDefault();
                        const taskId = event.dataTransfer.getData("text/plain");
                        setDropCellKey(null);
                        if (taskId) void handleMoveTask(taskId, date, null);
                      }}
                    >
                      <button
                        type="button"
                        className="v2-calendar-day flex min-h-[32px] items-center p-[2px_4px] [border:0] [background:none] cursor-pointer
                          [@media(max-width:640px)]:w-full [@media(max-width:640px)]:min-h-[55px] [@media(max-width:640px)]:h-full
                          [@media(max-width:640px)]:justify-center [@media(max-width:640px)]:items-start
                          [@media(max-width:640px)]:pt-[9px] [&[aria-pressed=true]]:[background:var(--v2-shell-fill)]
                          [&[aria-pressed=true]]:[box-shadow:inset_0_0_0_2px_var(--v2-accent)] [&[aria-pressed=true]]:rounded-[6px]"
                        aria-current={isToday ? "date" : undefined}
                        aria-pressed={
                          selectedDate !== null &&
                          dayKey(selectedDate) === dayKey(date)
                        }
                        onClick={() => openDay(date)}
                        aria-label={`${fullDateFormat.format(date)} · ${tasks.length} ${t("tasks")}`}
                      >
                        <span className="v2-calendar-day-number text-[12px] [font-weight:600] [font-variant-numeric:tabular-nums] text-[var(--v2-ink)]">
                          {date.getDate()}
                        </span>
                      </button>
                      <ul className="v2-calendar-chips flex flex-col gap-[3px] m-[0] p-[0] [list-style:none] min-w-[0] [@media(max-width:640px)]:[display:none]">
                        {tasks.slice(0, 3).map((task) => (
                          <li key={task._id}>
                            <button
                              type="button"
                              className="v2-calendar-chip flex items-baseline gap-[6px] w-full min-h-[0] p-[3px_6px] overflow-hidden
                                [border:1px_solid_transparent] rounded-[8px] [background:var(--v2-input-fill)] text-left
                                [&_span]:overflow-hidden [&_span]:text-ellipsis [&_span]:whitespace-nowrap [&_time]:flex-[0_0_auto]
                                [&_time]:text-[var(--v2-muted)] [&_time]:[font-variant-numeric:tabular-nums]
                                [&:hover]:border-[var(--v2-accent)] [&[data-status=given-up]]:[text-decoration:line-through]
                                [&[draggable=true]]:cursor-grab [&[draggable=true]:active]:cursor-grabbing"
                              data-status={task.status}
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData(
                                  "text/plain",
                                  task._id,
                                );
                              }}
                              onClick={() => setSelectedTaskId(task._id)}
                              title={task.title}
                            >
                              {task.dueDate && (
                                <time>
                                  {timeFormat.format(new Date(task.dueDate))}
                                </time>
                              )}
                              <span>{task.title}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      {tasks.length > 3 && (
                        <button
                          type="button"
                          className="v2-calendar-more self-start min-h-[0] p-[0_4px] [border:0] [background:none] text-left cursor-pointer [@media(max-width:640px)]:[display:none]"
                          onClick={() => openDay(date)}
                        >
                          +{tasks.length - 3}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : weekLayout === "detail" ? (
          <WeekDetailGrid
            days={weekDays}
            tasksByDay={tasksByDay}
            todayKey={dayKey(today)}
            dayKeyOf={dayKey}
            onOpenTask={setSelectedTaskId}
            onOpenDay={openDay}
            onMoveTask={(taskId, target, minute) =>
              void handleMoveTask(taskId, target, minute)
            }
          />
        ) : (
          <div className="v2-calendar-week-view grid grid-cols-[repeat(7,minmax(0,1fr))] gap-[10px] [@media(max-width:899px)]:grid-cols-[minmax(0,1fr)]">
            {weekDays.map(({ date }) => {
              const tasks = dayTasks(tasksByDay, date);
              return (
                <div
                  className="v2-calendar-week-col flex flex-col gap-[8px] min-h-[220px] p-[10px] [border:1px_solid_var(--v2-border)]
                    rounded-[16px] [background:var(--v2-input-fill)]
                    [&[data-today=true]]:[box-shadow:inset_0_0_0_1px_var(--v2-accent)]
                    [@media(max-width:899px)]:min-h-[0]"
                  key={date.toISOString()}
                  data-today={dayKey(date) === dayKey(today)}
                >
                  <button
                    type="button"
                    className="v2-calendar-week-head flex flex-col items-start gap-[2px] min-h-[0] p-[0] [border:0] [background:none]
                      cursor-pointer [&_span:first-child]:text-[11px] [&_span:first-child]:[letter-spacing:0.06em]
                      [&_span:first-child]:uppercase [&_span:first-child]:text-[var(--v2-muted)]
                      [&_span:last-child]:[font-family:var(--v2-font-heading)] [&_span:last-child]:text-[20px]
                      [&_span:last-child]:[font-weight:600] [&_span:last-child]:text-[var(--v2-ink)]"
                    onClick={() => openDay(date)}
                    aria-label={`${fullDateFormat.format(date)} · ${tasks.length} ${t("tasks")}`}
                  >
                    <span>{weekdayFormat.format(date)}</span>
                    <span>{date.getDate()}</span>
                  </button>
                  {tasks.length ? (
                    <ul className="v2-calendar-week-list flex flex-col gap-[4px] m-[0] p-[0] [list-style:none]">
                      {tasks.map((task) => (
                        <li key={task._id}>
                          <button
                            type="button"
                            className="v2-calendar-week-task flex flex-col gap-[2px] w-full min-h-[0] p-[6px_8px] [border:1px_solid_transparent]
                              rounded-[10px] [background:var(--v2-glass-fill)] text-left cursor-pointer [&_time]:text-[10px]
                              [&_time]:text-[var(--v2-muted)] [&_time]:[font-variant-numeric:tabular-nums]
                              [&:hover]:border-[var(--v2-accent)] [&[data-status=given-up]]:[text-decoration:line-through]"
                            data-status={task.status}
                            onClick={() => setSelectedTaskId(task._id)}
                          >
                            {task.dueDate && (
                              <time>
                                {timeFormat.format(new Date(task.dueDate))}
                              </time>
                            )}
                            <span>{task.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="v2-calendar-week-empty text-[11px] text-[var(--v2-muted)]">
                      {t("noTasks")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedDate && (
        <aside
          className="v2-agent-panel [border:1px_solid_var(--v2-glass-border)] rounded-[var(--v2-radius-card)] flex-col min-w-[0]
            min-h-[0] v2-calendar-day-panel right-[24px] bottom-[96px] z-55 w-[min(320px,calc(100vw_-_32px))]
            max-h-[60dvh] [@media(max-width:899px)]:w-full [@media(max-width:899px)]:max-h-none"
          aria-label={fullDateFormat.format(selectedDate)}
        >
          <div
            className="v2-agent-panel-head flex items-center justify-between gap-[10px] mb-[12px] pb-[12px]
            [border-bottom:1px_solid_var(--v2-border)] [&_h2]:text-[12px] [&_h2]:[font-weight:600]
            [&_h2]:[letter-spacing:0.08em] [&_h2]:uppercase [&_h2]:text-[var(--v2-muted)]"
          >
            <h2>{fullDateFormat.format(selectedDate)}</h2>
            <button
              type="button"
              className="v2-btn v2-agent-panel-close"
              onClick={() => setSelectedDate(null)}
              aria-label={t("closeDay")}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="v2-agent-panel-body flex-1 min-h-[0] flex flex-col">
            {selectedTasks.length ? (
              <ul className="v2-calendar-day-list flex flex-col gap-[6px] m-[0] p-[0] [list-style:none] overflow-y-auto">
                {selectedTasks.map((task) => (
                  <li
                    key={task._id}
                    className="v2-calendar-day-item flex flex-col gap-[6px]"
                  >
                    <button
                      type="button"
                      className="v2-calendar-day-task flex gap-[10px] w-full min-h-[0] p-[8px_10px] [border:1px_solid_var(--v2-border)]
                        rounded-[10px] [background:var(--v2-input-fill)] text-left cursor-pointer [&_time]:flex-[0_0_auto]
                        [&_time]:text-[var(--v2-muted)] [&_time]:text-[11px] [&_time]:[font-variant-numeric:tabular-nums]
                        [&:hover]:border-[var(--v2-accent)]"
                      data-status={task.status}
                      onClick={() => setSelectedTaskId(task._id)}
                    >
                      <time>
                        {task.dueDate
                          ? timeFormat.format(new Date(task.dueDate))
                          : ""}
                      </time>
                      <span>{task.title}</span>
                    </button>
                    <TaskStatusActions task={task} compact />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v2-calendar-week-empty text-[11px] text-[var(--v2-muted)]">
                {t("noTasks")}
              </p>
            )}
          </div>
        </aside>
      )}

      {selectedTaskId && (
        <TaskDetailsDialog
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {creating && (
        <TaskEditor
          onSaved={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  );
}
