import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { getLocale } from "@/shared/i18n";
import type { Task } from "@/shared/types/domain";

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

interface PlacedTask {
  task: Task;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
}

const minutesOfDay = (value: string): number => {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
};

// A task without a start time is a point in time: render one slot ending at the due time.
function placeDayTasks(tasks: Task[]): PlacedTask[] {
  const placed: PlacedTask[] = [];

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const dueDate = new Date(task.dueDate);
    if (Number.isNaN(dueDate.getTime())) continue;

    const dueMinute = minutesOfDay(task.dueDate);
    // A midnight start carries no time-of-day information: treat the task as a
    // point in time so it does not paint the whole night.
    const startMinute = task.startDate
      ? Math.min(minutesOfDay(task.startDate), dueMinute)
      : null;
    const hasSpan = startMinute !== null && startMinute > 0;

    let top: number;
    let height: number;

    if (hasSpan) {
      top = startMinute * PIXELS_PER_MINUTE;
      height = Math.max(
        (dueMinute - startMinute) * PIXELS_PER_MINUTE,
        SLOT_HEIGHT,
      );
    } else {
      height = SLOT_HEIGHT;
      top = Math.max(0, dueMinute * PIXELS_PER_MINUTE - SLOT_HEIGHT);
    }

    top = Math.max(0, Math.min(top, TOTAL_HEIGHT - height));
    placed.push({ task, top, height, lane: 0, laneCount: 1 });
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
}

export default function WeekDetailGrid({
  days,
  tasksByDay,
  todayKey,
  dayKeyOf,
  onOpenTask,
  onOpenDay,
  onMoveTask,
}: WeekDetailGridProps) {
  const { t } = useTranslation("v2");
  const [dropPreview, setDropPreview] = useState<{
    key: string;
    minute: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const locale = getLocale();
  const weekdayFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short" }),
    [locale],
  );
  const timeFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { timeStyle: "short" }),
    [locale],
  );

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (container && container.scrollTop === 0) {
      container.scrollTop = START_SCROLL_MINUTE * PIXELS_PER_MINUTE;
    }
  }, []);

  return (
    <div
      className="v2-timeline-scroll max-h-[560px] overflow-auto [border:1px_solid_var(--v2-border)] rounded-[16px] [background:var(--v2-input-fill)] [@media(max-width:899px)]:max-h-[460px]"
      ref={scrollRef}
      data-testid="v2-week-detail"
    >
      <div className="v2-timeline min-w-[760px]">
        <div className="v2-timeline-head sticky top-[0] z-2 grid grid-cols-[56px_repeat(7,minmax(0,1fr))] [border-bottom:1px_solid_var(--v2-border)] [background:var(--v2-surface-solid)]">
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
            const laidOut = placeDayTasks(tasksByDay.get(dayKeyOf(date)) ?? []);

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
                {laidOut.map(({ task, top, height, lane, laneCount }) => (
                  <button
                    key={task._id}
                    type="button"
                    className="v2-timeline-block absolute flex flex-col gap-[1px] p-[3px_6px] overflow-hidden
                      [border:1px_solid_var(--v2-border)] rounded-[8px] [background:var(--v2-surface-solid)]
                      [box-shadow:var(--v2-shadow-sm)] text-left cursor-pointer [&:hover]:z-3 [&:hover]:border-[var(--v2-accent)]
                      [&[data-status=completed]]:[background:var(--v2-input-fill)]
                      [&[data-status=given-up]]:[text-decoration:line-through] [&[draggable=true]]:cursor-grab
                      [&[draggable=true]:active]:cursor-grabbing [&[data-dragging=true]]:opacity-[0.6]"
                    data-status={task.status}
                    style={{
                      top,
                      height,
                      left: `calc(${(lane * 100) / laneCount}% + 3px)`,
                      width: `calc(${100 / laneCount}% - 6px)`,
                    }}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", task._id);
                    }}
                    onClick={() => onOpenTask(task._id)}
                    title={`${task.title} · ${
                      task.dueDate
                        ? timeFormat.format(new Date(task.dueDate))
                        : ""
                    }`}
                  >
                    <span className="v2-timeline-block-time text-[var(--v2-muted)] text-[10px] [font-variant-numeric:tabular-nums]">
                      {task.dueDate
                        ? timeFormat.format(new Date(task.dueDate))
                        : ""}
                    </span>
                    <span className="v2-timeline-block-title overflow-hidden text-ellipsis whitespace-nowrap">
                      {task.title}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <p className="v2-timeline-hint p-[8px_12px] text-[var(--v2-muted)] text-[11px]">
        {t("weekDetailHint")} {t("dragHint")}
      </p>
    </div>
  );
}
