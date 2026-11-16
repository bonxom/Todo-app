import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
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
      minute ??
      (source ? source.getHours() * 60 + source.getMinutes() : 0);
    const next = new Date(target);
    next.setHours(Math.floor(targetMinute / 60), targetMinute % 60, 0, 0);

    setMoveError(null);
    try {
      await calendarMutations.changeTaskDueDate(task, toISOStringLocal(next));
    } catch (err) {
      setMoveError(
        err instanceof Error ? err.message : t("errorMovingTask"),
      );
    }
  };
  const selectedTasks = selectedDate ? dayTasks(tasksByDay, selectedDate) : [];

  return (
    <div className="v2-calendar" data-testid="v2-calendar-page">
      <header className="v2-agents-heading">
        <div>
          <p className="v2-eyebrow">
            <span aria-hidden="true" />
            {t("calendarEyebrow")}
          </p>
          <h1>
            {t("calendarHeading")}
            <span>{t("calendarHeadingAccent")}</span>
          </h1>
          <p className="v2-heading-description">{t("calendarDescription")}</p>
        </div>
        <div className="v2-agents-heading-actions">
          <div className="v2-calendar-nav" role="group" aria-label={t("calendar")}>
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
            className="v2-agent-tabs v2-calendar-views"
            role="group"
            aria-label={t("calendarViewLabel")}
          >
            <button
              type="button"
              className="v2-agent-tab"
              data-active={viewMode === "week"}
              aria-pressed={viewMode === "week"}
              onClick={() => setViewMode("week")}
            >
              {t("weekView")}
            </button>
            <button
              type="button"
              className="v2-agent-tab"
              data-active={viewMode === "month"}
              aria-pressed={viewMode === "month"}
              onClick={() => setViewMode("month")}
            >
              {t("monthView")}
            </button>
          </div>
          <button
            type="button"
            className="v2-btn v2-btn-primary"
            onClick={() => setCreating(true)}
          >
            <Plus size={16} aria-hidden="true" />
            <span>{t("newTask")}</span>
          </button>
        </div>
      </header>

      {moveError && (
        <p className="v2-form-error" role="alert">
          {moveError}
        </p>
      )}

      <section className="v2-agent-panel v2-calendar-panel">
        <div className="v2-calendar-toolbar">
          <h2 aria-live="polite">{periodLabel}</h2>
          {viewMode === "week" && (
            <div
              className="v2-agent-tabs v2-calendar-week-layouts"
              role="group"
              aria-label={t("weekLayoutLabel")}
            >
              <button
                type="button"
                className="v2-agent-tab"
                data-active={weekLayout === "detail"}
                aria-pressed={weekLayout === "detail"}
                onClick={() => setWeekLayout("detail")}
              >
                {t("weekDetail")}
              </button>
              <button
                type="button"
                className="v2-agent-tab"
                data-active={weekLayout === "agenda"}
                aria-pressed={weekLayout === "agenda"}
                onClick={() => setWeekLayout("agenda")}
              >
                {t("weekAgenda")}
              </button>
            </div>
          )}
          <span className="v2-calendar-count">
            <CalendarDays size={15} aria-hidden="true" />
            {renderedTasks.length} {t("tasks")}
          </span>
        </div>

        {tasksQuery.isLoading ? (
          <p className="v2-skills-status" role="status">
            {t("loadingCalendar")}
          </p>
        ) : errorMessage ? (
          <div className="v2-skills-status" role="alert">
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
            className="v2-calendar-month"
            role="grid"
            aria-label={periodLabel}
          >
            <div className="v2-calendar-weekdays" role="row">
              {monthRows[0]?.map(({ date }) => (
                <span key={date.toISOString()} role="columnheader">
                  {weekdayFormat.format(date)}
                </span>
              ))}
            </div>
            {monthRows.map((row) => (
              <div
                className="v2-calendar-week"
                role="row"
                key={row[0]?.date.toISOString()}
              >
                {row.map(({ date, isCurrentMonth }) => {
                  const tasks = dayTasks(tasksByDay, date);
                  const isToday = dayKey(date) === dayKey(today);
                  return (
                    <div
                      className="v2-calendar-cell"
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
                        className="v2-calendar-day"
                        onClick={() => openDay(date)}
                        aria-label={`${fullDateFormat.format(date)} · ${tasks.length} ${t("tasks")}`}
                      >
                        <span className="v2-calendar-day-number">
                          {date.getDate()}
                        </span>
                      </button>
                      <ul className="v2-calendar-chips">
                        {tasks.slice(0, 3).map((task) => (
                          <li key={task._id}>
                            <button
                              type="button"
                              className="v2-calendar-chip"
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
                                <time>{timeFormat.format(new Date(task.dueDate))}</time>
                              )}
                              <span>{task.title}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      {tasks.length > 3 && (
                        <button
                          type="button"
                          className="v2-calendar-more"
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
          <div className="v2-calendar-week-view">
            {weekDays.map(({ date }) => {
              const tasks = dayTasks(tasksByDay, date);
              return (
                <div
                  className="v2-calendar-week-col"
                  key={date.toISOString()}
                  data-today={dayKey(date) === dayKey(today)}
                >
                  <button
                    type="button"
                    className="v2-calendar-week-head"
                    onClick={() => openDay(date)}
                    aria-label={`${fullDateFormat.format(date)} · ${tasks.length} ${t("tasks")}`}
                  >
                    <span>{weekdayFormat.format(date)}</span>
                    <span>{date.getDate()}</span>
                  </button>
                  {tasks.length ? (
                    <ul className="v2-calendar-week-list">
                      {tasks.map((task) => (
                        <li key={task._id}>
                          <button
                            type="button"
                            className="v2-calendar-week-task"
                            data-status={task.status}
                            onClick={() => setSelectedTaskId(task._id)}
                          >
                            {task.dueDate && (
                              <time>{timeFormat.format(new Date(task.dueDate))}</time>
                            )}
                            <span>{task.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="v2-calendar-week-empty">{t("noTasks")}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedDate && (
        <aside
          className="v2-agent-panel v2-calendar-day-panel"
          aria-label={fullDateFormat.format(selectedDate)}
        >
          <div className="v2-agent-panel-head">
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
          <div className="v2-agent-panel-body">
            {selectedTasks.length ? (
              <ul className="v2-calendar-day-list">
                {selectedTasks.map((task) => (
                  <li key={task._id} className="v2-calendar-day-item">
                    <button
                      type="button"
                      className="v2-calendar-day-task"
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
              <p className="v2-calendar-week-empty">{t("noTasks")}</p>
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
