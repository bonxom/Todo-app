import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useTranslation } from "react-i18next";
import useTimelineResize from "@/features/calendar/components/useTimelineResize";
import { getLocale } from "@/shared/i18n";
import type { Task } from "@/shared/types/domain";
import CalendarTaskCard from "./CalendarTaskCard";

const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 36;
const PIXELS_PER_MINUTE = SLOT_HEIGHT / SLOT_MINUTES;
const START_SCROLL_MINUTE = 8 * 60;

const SLOTS = Array.from({ length: (24 * 60) / SLOT_MINUTES }, (_, index) => {
  const minute = index * SLOT_MINUTES;
  return {
    minute,
    label: `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(
      minute % 60,
    ).padStart(2, "0")}`,
  };
});

const TOTAL_HEIGHT = SLOTS.length * SLOT_HEIGHT;
const SNAP_MINUTES = 15;
const LAST_MINUTE = 24 * 60 - SNAP_MINUTES;

const snappedMinuteAt = (
  event: DragEvent<HTMLDivElement>,
  element: HTMLDivElement,
): number => {
  const rect = element.getBoundingClientRect();
  const raw = (event.clientY - rect.top) / PIXELS_PER_MINUTE;
  const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
  return Math.max(0, Math.min(LAST_MINUTE, snapped));
};

interface TaskTiming {
  top: number;
  height: number;
  startMinute: number;
  endMinute: number;
  hasSpan: boolean;
}

interface PlacedTask extends TaskTiming {
  task: Task;
  lane: number;
  laneCount: number;
}

const minutesOfDay = (date: Date): number =>
  date.getHours() * 60 + date.getMinutes();

function taskTiming(task: Task): TaskTiming | null {
  if (!task.dueDate) return null;
  const due = new Date(task.dueDate);
  if (!Number.isFinite(due.getTime())) return null;

  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const start = task.startDate ? new Date(task.startDate) : null;
  const endMinute = minutesOfDay(due);
  const explicitStart =
    start && start < due ? (start < dueDay ? 0 : minutesOfDay(start)) : null;
  // Keep date-only midnight starts as due-only points in the timeline.
  const hasSpan =
    explicitStart !== null && explicitStart > 0 && explicitStart < endMinute;
  const startMinute = hasSpan
    ? explicitStart
    : Math.max(0, endMinute - SLOT_MINUTES);
  const height = Math.max(
    SLOT_HEIGHT,
    (endMinute - startMinute) * PIXELS_PER_MINUTE,
  );
  const top = Math.min(startMinute * PIXELS_PER_MINUTE, TOTAL_HEIGHT - height);
  return { top, height, startMinute, endMinute, hasSpan };
}

// A task without a start time is a point in time: render one slot ending at the due time.
function placeDayTasks(tasks: Task[]): PlacedTask[] {
  const placed: PlacedTask[] = [];

  for (const task of tasks) {
    const timing = taskTiming(task);
    if (timing) placed.push({ task, ...timing, lane: 0, laneCount: 1 });
  }

  placed.sort(
    (left, right) => left.top - right.top || right.height - left.height,
  );

  const clusters: PlacedTask[][] = [];
  let cluster: PlacedTask[] = [];
  let clusterEnd = -Infinity;
  for (const item of placed) {
    if (cluster.length && item.top >= clusterEnd) {
      clusters.push(cluster);
      cluster = [];
      clusterEnd = -Infinity;
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.top + item.height);
  }
  if (cluster.length) clusters.push(cluster);

  for (const group of clusters) {
    const laneEnds: number[] = [];
    for (const item of group) {
      let lane = laneEnds.findIndex((end) => end <= item.top);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.top + item.height);
      } else {
        laneEnds[lane] = item.top + item.height;
      }
      item.lane = lane;
    }
    for (const item of group) item.laneCount = laneEnds.length;
  }

  return placed;
}

export interface WeekDetailGridProps {
  days: Array<{ date: Date; isCurrentMonth: boolean }>;
  tasksByDay: Map<string, Task[]>;
  todayKey: string;
  dayKeyOf: (value: Date) => string;
  onOpenTask: (taskId: string) => void;
  onOpenDay: (date: Date) => void;
  onMoveTask: (taskId: string, target: Date, minute: number) => void;
  onResizeTask: (
    taskId: string,
    dates: { startDate?: string; dueDate?: string },
  ) => Promise<void>;
}

export default function WeekDetailGrid({
  days,
  tasksByDay,
  todayKey,
  dayKeyOf,
  onOpenTask,
  onOpenDay,
  onMoveTask,
  onResizeTask,
}: WeekDetailGridProps) {
  const { t } = useTranslation(["v2", "workspace"]);
  const [dropPreview, setDropPreview] = useState<{
    key: string;
    minute: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const resize = useTimelineResize({
    scrollRef,
    pixelsPerMinute: PIXELS_PER_MINUTE,
    interval: SNAP_MINUTES,
    onSave: onResizeTask,
    currentDate: days[0]?.date,
  });
  const resizePreview = resize.preview as {
    taskId: string;
    field: "startDate" | "dueDate";
    value: string;
  } | null;
  const locale = getLocale();
  const weekdayFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short" }),
    [locale],
  );
  const timeFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { timeStyle: "short" }),
    [locale],
  );
  const formatMinute = (date: Date, minute: number) => {
    const time = new Date(date);
    time.setHours(0, minute, 0, 0);
    return timeFormat.format(time);
  };

  useLayoutEffect(() => {
    const container = scrollRef.current;
    const header = headerRef.current;
    if (!container || !header) return;
    if (container.scrollTop === 0) {
      container.scrollTop = START_SCROLL_MINUTE * PIXELS_PER_MINUTE;
    }
    const measureHeader = () => {
      container.style.setProperty(
        "--v2-timeline-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    };
    measureHeader();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measureHeader);
    observer.observe(header, { box: "border-box" });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        className="v2-timeline-scroll max-h-[560px] overflow-auto [border:1px_solid_var(--v2-border)] rounded-[16px] [background:var(--v2-input-fill)] [@media(max-width:899px)]:max-h-[460px]"
        ref={scrollRef}
        data-testid="v2-week-detail"
      >
        <div className="v2-timeline min-w-[760px]">
          <div
            ref={headerRef}
            className="v2-timeline-head sticky top-[0] z-5 grid grid-cols-[56px_repeat(7,minmax(0,1fr))] [border-bottom:1px_solid_var(--v2-border)] [background:var(--v2-surface-solid)]"
          >
            <div className="v2-timeline-gutter-head" aria-hidden="true" />
            {days.map(({ date }) => (
              <button
                key={date.toISOString()}
                type="button"
                className="v2-timeline-day-head flex flex-col items-center gap-[2px] min-h-[0] p-[8px_4px] [background:none]
                cursor-pointer [&_span:first-child]:text-[10px] [&_span:first-child]:[letter-spacing:0.06em]
                [&_span:first-child]:uppercase [&_span:first-child]:text-[var(--v2-muted)]
                [&_span:last-child]:[font-family:var(--v2-font-heading)] [&_span:last-child]:text-[15px]
                [&_span:last-child]:[font-weight:600] [&_span:last-child]:text-[var(--v2-ink)]
                [&[data-today=true]_span:last-child]:text-[var(--v2-accent)]"
                data-today={dayKeyOf(date) === todayKey}
                onClick={() => onOpenDay(date)}
              >
                <span>{weekdayFormat.format(date)}</span>
                <span>{date.getDate()}</span>
              </button>
            ))}
          </div>

          <div
            className="v2-timeline-body relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]"
            style={{ height: TOTAL_HEIGHT }}
          >
            <div
              className="v2-timeline-gutter [border-right:1px_solid_var(--v2-border)]"
              aria-hidden="true"
            >
              {SLOTS.map((slot) => (
                <div
                  key={slot.minute}
                  className="v2-timeline-slot relative [border-top:1px_solid_transparent]
                  [&[data-hour=true]]:[border-top-color:var(--v2-border)] [&_span]:absolute [&_span]:top-[-7px]
                  [&_span]:right-[6px] [&_span]:p-[0_2px] [&_span]:[background:var(--v2-input-fill)]
                  [&_span]:text-[var(--v2-muted)] [&_span]:text-[10px] [&_span]:[font-variant-numeric:tabular-nums]"
                  style={{ height: SLOT_HEIGHT }}
                  data-hour={slot.minute % 60 === 0}
                >
                  {slot.minute % 60 === 0 && <span>{slot.label}</span>}
                </div>
              ))}
            </div>

            {days.map(({ date }) => {
              const laidOut = placeDayTasks(
                tasksByDay.get(dayKeyOf(date)) ?? [],
              );

              return (
                <div
                  key={date.toISOString()}
                  className="v2-timeline-day relative [border-left:1px_solid_var(--v2-border)]
                  bg-[repeating-linear-gradient(_to_bottom,var(--v2-border)_0_1px,transparent_1px_36px_)]
                  [&[data-today=true]]:bg-[var(--v2-shell-fill)]"
                  data-today={dayKeyOf(date) === todayKey}
                  style={{ height: TOTAL_HEIGHT }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropPreview({
                      key: dayKeyOf(date),
                      minute: snappedMinuteAt(event, event.currentTarget),
                    });
                  }}
                  onDragLeave={() => setDropPreview(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const taskId = event.dataTransfer.getData("text/plain");
                    const minute = snappedMinuteAt(event, event.currentTarget);
                    setDropPreview(null);
                    if (taskId) onMoveTask(taskId, date, minute);
                  }}
                >
                  {dropPreview?.key === dayKeyOf(date) && (
                    <span
                      className="v2-timeline-drop absolute right-[0] left-[0] h-[2px] [background:var(--v2-accent)] [box-shadow:0_0_0_1px_rgb(255_255_255_/_45%)] pointer-events-none"
                      style={{ top: dropPreview.minute * PIXELS_PER_MINUTE }}
                      aria-hidden="true"
                    />
                  )}
                  {laidOut.map((item) => {
                    const { task, lane, laneCount } = item;
                    const active = resizePreview?.taskId === task._id;
                    const timing = active
                      ? (taskTiming({
                          ...task,
                          [resizePreview.field]: resizePreview.value,
                        }) ?? item)
                      : item;
                    const end = formatMinute(date, timing.endMinute);
                    const time = timing.hasSpan
                      ? `${formatMinute(date, timing.startMinute)} – ${end}`
                      : end;

                    return (
                      <div
                        key={task._id}
                        className="v2-timeline-event absolute rounded-[6px] hover:z-3 focus-within:z-3 [&[data-resizing=true]]:z-4"
                        data-resizing={active}
                        style={{
                          top: timing.top,
                          height: timing.height,
                          left: `calc(${(lane * 100) / laneCount}% + 3px)`,
                          width: `calc(${100 / laneCount}% - 6px)`,
                        }}
                      >
                        <CalendarTaskCard
                          task={task}
                          variant="timeline"
                          time={time}
                          titleLines={Math.max(
                            1,
                            Math.floor((timing.height - 20) / 14),
                          )}
                          canDrag={!active && !resize.saving}
                          onClick={() => {
                            if (!resize.blockClick()) onOpenTask(task._id);
                          }}
                        />
                        {(["start", "end"] as const).map((edge) => {
                          const minute =
                            edge === "start"
                              ? timing.startMinute
                              : timing.endMinute;
                          const origin =
                            edge === "start"
                              ? item.startMinute
                              : item.endMinute;
                          const label = t(
                            edge === "start"
                              ? "calendarResizeStart"
                              : "calendarResizeEnd",
                            {
                              ns: "workspace",
                              title: task.title,
                            },
                          );
                          return (
                            <div
                              key={edge}
                              role="slider"
                              tabIndex={resize.saving ? -1 : 0}
                              aria-disabled={resize.saving}
                              aria-orientation="vertical"
                              aria-valuemin={0}
                              aria-valuemax={1439}
                              aria-valuenow={minute}
                              aria-valuetext={formatMinute(date, minute)}
                              aria-label={label}
                              title={label}
                              data-edge={edge}
                              data-cursor="native"
                              className="v2-timeline-resize-handle ui-focus-ring"
                              {...resize.bind(task, edge, origin)}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <p className="v2-timeline-hint p-[8px_12px] text-[var(--v2-muted)] text-[11px]">
          {t("weekDetailHint")} {t("dragHint")}
        </p>
      </div>
      {(resize.saving || resize.error) && (
        <p
          role={resize.error ? "alert" : "status"}
          className={`mt-2 text-xs ${resize.error ? "text-[var(--color-danger)]" : "text-[var(--v2-muted)]"}`}
        >
          {t(resize.error ? "calendarResizeFailed" : "calendarResizeSaving", {
            ns: "workspace",
          })}
        </p>
      )}
    </>
  );
}
