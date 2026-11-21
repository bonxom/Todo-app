import {
  memo,
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { getLocale } from "@/shared/i18n";
import { workspaceKey } from "@/features/tasks/utils/workspaceTranslation";
import TaskDetailButton from "@/features/tasks/components/TaskDetailButton";
import {
  buildWeekDays,
  getDateKey,
  isSameDay,
  startOfDay,
} from "./calendarUtils";
import useTimelineResize from "./useTimelineResize";
import { layoutDayTasks } from "./timelineLayout";
import {
  formatDateTime,
  toDateTimeLocalValue,
  toISOStringLocal,
} from "@/shared/utils/dateTime";
import {
  getTaskDragData,
  isCopyDragRequested,
  setTaskDragData,
} from "@/shared/utils/taskDrag";
import { getTaskProjectColor } from "@/shared/utils/projectColor";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const taskPreviewTone = (task) => {
  if (task.status === "completed" || task.status === "given-up") {
    return {
      borderColor: "var(--color-line)",
      background: "var(--color-surface-muted)",
      metaColor:
        task.status === "given-up"
          ? "var(--color-danger)"
          : "var(--color-text-muted)",
    };
  }

  if (task.isOverDue) {
    return {
      borderColor: "var(--color-danger-soft)",
      background: "var(--color-surface)",
      metaColor: "var(--color-danger)",
    };
  }

  return {
    borderColor: "var(--color-line)",
    background: "var(--color-surface)",
    metaColor: "var(--color-text-muted)",
  };
};

const buildDroppedDueDate = (targetDay, sourceDueDate) => {
  const nextDueDate = new Date(targetDay);
  const sourceDate = sourceDueDate ? new Date(sourceDueDate) : null;

  if (sourceDate && !Number.isNaN(sourceDate.getTime())) {
    nextDueDate.setHours(sourceDate.getHours(), sourceDate.getMinutes(), 0, 0);
    return nextDueDate;
  }

  nextDueDate.setHours(0, 0, 0, 0);
  return nextDueDate;
};

const formatMinuteString = (minute) => {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const WeekTimeline = memo(
  ({
    currentDate,
    selectedDate,
    onDateSelect,
    tasksByDate = {},
    onTaskDueDateChange,
    onTaskCopy,
    intervalMinutes = 30,
    viewportRef,
    onTaskUpdated,
    onTaskDatesChange,
  }) => {
    const { t } = useTranslation("workspace");
    const [editingTask, setEditingTask] = useState(null);
    const [dragOverDayKey, setDragOverDayKey] = useState(null);
    const [draggingTaskId, setDraggingTaskId] = useState(null);

    const scrollContainerRef = useRef(null);
    const localViewport = useRef({ minute: 480 });
    const viewport = viewportRef || localViewport;

    const days = useMemo(() => buildWeekDays(currentDate), [currentDate]);
    const today = useMemo(() => startOfDay(new Date()), []);

    // 36px per interval
    const slotHeight = 36;
    const pixelsPerMinute = slotHeight / intervalMinutes;

    const timeSlots = useMemo(() => {
      const slots = [];
      for (let m = 0; m < 1440; m += intervalMinutes) {
        slots.push({
          minute: m,
          label: formatMinuteString(m),
        });
      }
      return slots;
    }, [intervalMinutes]);

    const totalTimelineHeight = timeSlots.length * slotHeight;
    const resize = useTimelineResize({
      scrollRef: scrollContainerRef,
      pixelsPerMinute,
      interval: intervalMinutes,
      onSave: onTaskDatesChange,
      currentDate,
    });

    useLayoutEffect(() => {
      const container = scrollContainerRef.current;
      if (container)
        container.scrollTop = viewport.current.minute * pixelsPerMinute;
    }, [pixelsPerMinute, viewport]);

    useEffect(() => {
      const container = scrollContainerRef.current;
      let lastWidth = 0;
      const centerSelectedDay = () => {
        const selectedEl = container?.querySelector(
          '[data-timeline-header-day][aria-pressed="true"]',
        );
        if (container && selectedEl && lastWidth !== container.clientWidth) {
          lastWidth = container.clientWidth;
          container.scrollLeft +=
            selectedEl.getBoundingClientRect().left -
            container.getBoundingClientRect().left -
            (container.clientWidth - selectedEl.clientWidth + 64) / 2;
        }
      };
      centerSelectedDay();
      if (!container || typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(centerSelectedDay);
      observer.observe(container);
      return () => observer.disconnect();
    }, [selectedDate]);

    const handleDragOver = (e, dateKey) => {
      e.preventDefault();
      e.stopPropagation();
      const copyState = isCopyDragRequested(e);
      e.dataTransfer.dropEffect = copyState.shouldCopy ? "copy" : "move";
      setDragOverDayKey(dateKey);
    };

    const handleDragLeave = (e, dateKey) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragOverDayKey === dateKey) {
        setDragOverDayKey(null);
      }
    };

    const handleDrop = async (e, day) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverDayKey(null);

      const copyState = isCopyDragRequested(e);
      const { taskId, currentDueDate, taskCopyPayload } = getTaskDragData(e);
      if (!taskId) return;

      if (currentDueDate && isSameDay(currentDueDate, day)) {
        return;
      }

      try {
        const newDueDate = buildDroppedDueDate(day, currentDueDate);
        const nextDueDate = toISOStringLocal(toDateTimeLocalValue(newDueDate));

        if (copyState.shouldCopy) {
          if (!taskCopyPayload?.title) {
            throw new Error("Missing task data for copy");
          }

          const { projectStatus, ...copyPayload } = taskCopyPayload;

          await onTaskCopy?.(
            {
              ...copyPayload,
              projectId:
                projectStatus === "completed"
                  ? undefined
                  : copyPayload.projectId,
            },
            nextDueDate,
          );
          return;
        }

        await onTaskDueDateChange?.(taskId, nextDueDate);
      } catch (error) {
        console.error("Failed to update task deadline:", error);
      }
    };

    return (
      <>
        {(resize.saving || resize.error) && (
          <p
            className="calendar-resize-feedback p-[8px_22px] text-[var(--color-text-muted)] text-[12px] [&[role=alert]]:text-[var(--color-danger)]"
            role={resize.error ? "alert" : "status"}
          >
            {t(resize.error ? "calendarResizeFailed" : "calendarResizeSaving")}
          </p>
        )}
        <div
          className="calendar-week-timeline-scroll max-h-[600px] overflow-auto [border-top:1px_solid_var(--color-line)]
            [scroll-margin-top:80px] [scroll-padding-top:80px] relative isolate
            [@media(max-width:650px)]:max-h-[520px] ui-focus-ring"
          data-cursor-clip-header=".calendar-week-timeline-header"
          ref={scrollContainerRef}
          tabIndex={0}
          role="region"
          aria-label={t("calendarDates")}
          onScroll={(event) => {
            viewport.current.minute =
              event.currentTarget.scrollTop / pixelsPerMinute;
          }}
          style={{
            "--timeline-hour-height": `${60 * pixelsPerMinute}px`,
            "--timeline-slot-height": `${slotHeight}px`,
          }}
        >
          <div className="calendar-week-timeline-board">
            <div
              className="calendar-week-timeline-header [&_button]:min-h-[48px] grid grid-cols-[64px_repeat(7,minmax(0,1fr))] sticky
              top-[0] z-4 [background:var(--color-surface)] [border-bottom:1px_solid_var(--color-line)]"
            >
              <div className="calendar-week-timeline-corner sticky left-[0] z-5 grid place-items-center [background:var(--color-surface-muted)] text-[10px] text-[var(--color-text-muted)] text-center p-[6px]">
                {t("calendarLocalTime")}
              </div>
              {days.map(({ date }) => {
                const dateKey = getDateKey(date);
                const isToday = isSameDay(date, today);
                const isSelected = isSameDay(date, selectedDate);
                return (
                  <button
                    type="button"
                    key={dateKey}
                    className="calendar-timeline-date grid grid-cols-[1fr_auto] gap-[4px] items-center p-[10px_12px] h-[72px]
                      [border-left:1px_solid_var(--color-line)] text-left cursor-pointer [&_>_span:first-child]:col-[1_/_-1]
                      ui-focus-ring"
                    data-timeline-header-day={dateKey}
                    aria-pressed={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={date.toLocaleDateString(getLocale(), {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    onClick={() => onDateSelect?.(date)}
                    onDragOver={(event) => handleDragOver(event, dateKey)}
                    onDragLeave={(event) => handleDragLeave(event, dateKey)}
                    onDrop={(event) => handleDrop(event, date)}
                  >
                    <span>
                      {t(workspaceKey(WEEK_DAYS[date.getDay()]), {
                        defaultValue: WEEK_DAYS[date.getDay()],
                      })}
                    </span>
                    <span className="calendar-timeline-date-number grid place-items-center w-[27px] h-[27px] text-[13px] [font-weight:600] rounded-[50%]">
                      {date.getDate()}
                    </span>
                    <span className="calendar-day-count text-[10px] text-[var(--color-text-muted)] [@media(max-width:650px)]:text-[8px]">
                      {(tasksByDate[dateKey] || []).length || ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="calendar-week-timeline-body grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
              <div className="calendar-week-time-gutter sticky left-[0] z-3 [background:var(--color-surface)]">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.minute}
                    className="calendar-week-time-label text-right p-[4px_9px_0_0] text-[10px] text-[var(--color-text-muted)] opacity-[0.65] [&[data-hour=true]]:[font-weight:600] [&[data-hour=true]]:opacity-[1]"
                    data-hour={slot.minute % 60 === 0}
                    style={{ height: slotHeight }}
                  >
                    <span className="ui-tabular [font-family:var(--font-mono)] [font-variant-numeric:tabular-nums]">
                      {slot.label}
                    </span>
                  </div>
                ))}
              </div>
              {days.map(({ date }) => {
                const dateKey = getDateKey(date);
                const isToday = isSameDay(date, today);
                const isSelected = isSameDay(date, selectedDate);
                const laidOut = layoutDayTasks(
                  tasksByDate[dateKey] || [],
                  date,
                  pixelsPerMinute,
                );
                return (
                  <div
                    key={dateKey}
                    role="button"
                    tabIndex={0}
                    className="calendar-day calendar-timeline-column relative min-w-[0] [border-left:1px_solid_var(--color-line)]
                      bg-[repeating-linear-gradient(_to_bottom,var(--color-line)_0_1px,transparent_1px_var(--timeline-hour-height)_),repeating-linear-gradient(_to_bottom,color-mix(in_srgb,var(--color-line)_45%,transparent)_0_1px,transparent_1px_var(--timeline-slot-height)_)]
                      [&[data-selected=true]]:bg-[color-mix(_in_srgb,var(--color-accent-soft)_35%,transparent_)]
                      [&[data-drag-over=true]]:bg-[var(--color-accent-soft)] ui-focus-ring"
                    style={{ height: totalTimelineHeight }}
                    aria-label={t("dayTaskCount", {
                      date: date.toLocaleDateString(getLocale(), {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }),
                      count: laidOut.length,
                    })}
                    aria-pressed={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    data-selected={isSelected}
                    data-today={isToday}
                    data-drag-over={dragOverDayKey === dateKey}
                    onClick={() => onDateSelect?.(date)}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        ["Enter", " "].includes(event.key)
                      ) {
                        event.preventDefault();
                        onDateSelect?.(date);
                      }
                    }}
                    onDragOver={(event) => handleDragOver(event, dateKey)}
                    onDragLeave={(event) => handleDragLeave(event, dateKey)}
                    onDrop={(event) => handleDrop(event, date)}
                  >
                    {laidOut.map((item, index) => {
                      const activePreview =
                        resize.preview?.taskId ===
                        (item.task._id || item.task.id)
                          ? resize.preview
                          : null;
                      const displayed = activePreview
                        ? {
                            ...item,
                            ...activePreview,
                            top: Math.min(
                              activePreview.startMinute * pixelsPerMinute,
                              totalTimelineHeight -
                                Math.max(
                                  28,
                                  (activePreview.endMinute -
                                    activePreview.startMinute) *
                                    pixelsPerMinute,
                                ),
                            ),
                            height: Math.max(
                              28,
                              (activePreview.endMinute -
                                activePreview.startMinute) *
                                pixelsPerMinute,
                            ),
                            isReversedOrZero: false,
                          }
                        : item;
                      const {
                        task,
                        startMinute,
                        endMinute,
                        top,
                        height,
                        lane,
                        laneCount,
                        isReversedOrZero,
                      } = displayed;
                      const taskId = task._id || task.id || String(index);
                      const tone = taskPreviewTone(task);
                      const done = ["completed", "given-up"].includes(
                        task.status,
                      );
                      const timeLabel = isReversedOrZero
                        ? formatMinuteString(endMinute)
                        : `${formatMinuteString(startMinute)} – ${formatMinuteString(endMinute)}`;
                      const range = task.startDate
                        ? `${formatDateTime(task.startDate)} – ${formatDateTime(task.dueDate)}`
                        : formatDateTime(task.dueDate);
                      return (
                        <div
                          key={taskId}
                          className="calendar-timeline-event absolute [&[data-resizing=true]]:z-3 [&[data-resizing=true]]:[outline:2px_solid_var(--color-accent)] [&[data-resizing=true]]:rounded-[5px]"
                          data-resizing={Boolean(activePreview)}
                          style={{
                            top,
                            height,
                            left: `calc(${(lane * 100) / laneCount}% + 3px)`,
                            width: `calc(${100 / laneCount}% - 6px)`,
                          }}
                        >
                          <button
                            type="button"
                            className="calendar-timeline-task [&[data-dragging=true]]:opacity-[0.55] ui-focus-ring"
                            data-cal-task-card
                            data-compact={height < 62 && !activePreview}
                            data-dragging={draggingTaskId === taskId}
                            data-completed={done}
                            style={{
                              "--timeline-title-lines": height >= 100 ? 4 : 2,
                              borderColor: tone.borderColor,
                              background: tone.background,
                              borderLeftColor: task.projectId
                                ? getTaskProjectColor(task)
                                : "var(--color-accent)",
                            }}
                            aria-label={t("messages.editV0", {
                              v0: task.title,
                            })}
                            title={`${task.title} • ${timeLabel} • ${range}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!resize.blockClick()) setEditingTask(task);
                            }}
                            draggable={
                              Boolean(task._id || task.id) &&
                              !resize.saving &&
                              !activePreview
                            }
                            onDragStart={(event) => {
                              event.stopPropagation();
                              setTaskDragData(event, task);
                              setDraggingTaskId(taskId);
                            }}
                            onDragEnd={() => {
                              setDraggingTaskId(null);
                              setDragOverDayKey(null);
                            }}
                          >
                            <span className="calendar-timeline-task-content block sticky top-[78px]">
                              <span
                                data-cal-due-time
                                className="calendar-timeline-task-time text-[10px] [line-height:1.35] [font-variant-numeric:tabular-nums] mb-[5px] whitespace-normal"
                                style={{ color: tone.metaColor }}
                              >
                                {timeLabel}
                              </span>
                              <span
                                data-cal-task-name
                                className={done ? "line-through" : ""}
                              >
                                {task.title}
                              </span>
                              {task.description &&
                                height >= 160 &&
                                laneCount === 1 && (
                                  <span
                                    className="calendar-timeline-task-description [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]
                                    overflow-hidden text-[10px] [line-height:1.5] mt-[6px] text-[var(--color-text-muted)]"
                                  >
                                    {task.description}
                                  </span>
                                )}
                            </span>
                          </button>
                          {onTaskDatesChange &&
                            (task._id || task.id) &&
                            ["start", "end"].map((edge) => (
                              <div
                                key={edge}
                                role="slider"
                                tabIndex={resize.saving ? -1 : 0}
                                aria-disabled={resize.saving}
                                aria-orientation="vertical"
                                aria-valuemin={0}
                                aria-valuemax={1439}
                                aria-valuenow={
                                  edge === "start" ? startMinute : endMinute
                                }
                                aria-valuetext={formatMinuteString(
                                  edge === "start" ? startMinute : endMinute,
                                )}
                                aria-label={t(
                                  edge === "start"
                                    ? "calendarResizeStart"
                                    : "calendarResizeEnd",
                                  { title: task.title },
                                )}
                                title={t(
                                  edge === "start"
                                    ? "calendarResizeStart"
                                    : "calendarResizeEnd",
                                  { title: task.title },
                                )}
                                className="calendar-resize-handle absolute left-[0] right-[0] max-h-[40%] z-2 touch-none [&[data-edge=start]]:top-[0]
                                  [&[data-edge=end]]:bottom-[0] [&::after]:absolute [&::after]:left-[50%] [&::after]:top-[4px]
                                  [&::after]:w-[26px] [&::after]:max-w-[70%] [&::after]:rounded-[3px] [&::after]:[transform:translateX(-50%)]
                                  [&::after]:[background:var(--color-accent)] [&::after]:pointer-events-none [&[data-edge=end]::after]:top-auto
                                  [&[data-edge=end]::after]:bottom-[4px] [&[aria-disabled=true]]:pointer-events-none
                                  [@media(max-width:650px)]:max-h-[40%] ui-focus-ring"
                                data-edge={edge}
                                data-cursor="native"
                                {...resize.bind(
                                  task,
                                  edge,
                                  edge === "start"
                                    ? item.startMinute
                                    : item.endMinute,
                                )}
                              />
                            ))}
                          {activePreview && (
                            <span
                              className="calendar-resize-preview absolute top-[12px] left-[4px] p-[4px_6px] rounded-[4px]
                                [background:var(--color-accent)] text-[var(--color-on-accent,white)] text-[11px] whitespace-nowrap
                                pointer-events-none z-4 [&[data-edge=end]]:top-auto [&[data-edge=end]]:bottom-[12px]"
                              data-edge={
                                activePreview.field === "startDate"
                                  ? "start"
                                  : "end"
                              }
                              role="status"
                            >
                              {timeLabel}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <TaskDetailButton
          isOpen={Boolean(editingTask)}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onTaskUpdated={onTaskUpdated}
        />
      </>
    );
  },
);

WeekTimeline.displayName = "WeekTimeline";
export default WeekTimeline;
