import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { CheckCircle2, GripVertical, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { afterTaskUncovered } from "@/features/tasks/hooks/afterTaskUncovered";
import type { Task } from "@/shared/types/domain";

const variants = {
  month:
    "v2-calendar-chip flex items-center gap-[5px] rounded-[6px] p-[3px_6px]",
  timeline:
    "v2-timeline-block flex h-full flex-col gap-px rounded-[6px] p-[2px_6px] shadow-[var(--v2-shadow-sm)]",
  agenda: "v2-calendar-week-task flex flex-col gap-1 rounded-[8px] p-[6px_8px]",
  day: "v2-calendar-day-task flex flex-col gap-1 rounded-[8px] p-[8px_10px]",
};

type Props = Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "className" | "draggable" | "onDragStart"
> & {
  task: Task;
  time?: string;
  variant: keyof typeof variants;
  titleLines?: number;
  canDrag?: boolean;
};

export default function CalendarTaskCard({
  task,
  time,
  variant,
  titleLines = 1,
  canDrag = true,
  ...props
}: Props) {
  const { t } = useTranslation("v2");
  const cardRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const previousStatus = useRef(task.status);
  const StatusIcon =
    task.status === "completed"
      ? CheckCircle2
      : task.status === "given-up"
        ? XCircle
        : null;
  const statusLabel =
    task.status === "completed"
      ? t("completed")
      : task.status === "given-up"
        ? t("givenUp")
        : undefined;
  const cardLabel = [task.title, time, statusLabel].filter(Boolean).join(" · ");

  useEffect(() => {
    const justCompleted =
      previousStatus.current !== "completed" && task.status === "completed";
    previousStatus.current = task.status;
    if (
      !justCompleted ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return;

    let animation: Animation | undefined;
    const stopWaiting = afterTaskUncovered(cardRef.current, () => {
      animation = iconRef.current?.animate?.(
        [
          { opacity: 0.45, transform: "scale(0.7)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: 220, easing: "ease-out" },
      );
    });
    return () => {
      stopWaiting();
      animation?.cancel();
    };
  }, [task.status]);

  const compact = variant === "month";
  const timeline = variant === "timeline";
  const showStatusLabel = variant === "agenda" || variant === "day";
  const dueTime = time && (
    <time className="v2-calendar-task-time ml-auto shrink-0 text-[10px] tabular-nums text-[var(--v2-muted)]">
      {time}
    </time>
  );
  const heading = (
    <span
      className={`flex min-w-0 gap-[5px] ${timeline ? "items-start" : "flex-1 items-center"}`}
    >
      {StatusIcon && (
        <StatusIcon
          ref={iconRef}
          size={12}
          className="v2-calendar-task-status shrink-0"
          aria-hidden="true"
        />
      )}
      <span
        className={`v2-calendar-task-title min-w-0 font-medium ${timeline ? "overflow-hidden" : "truncate"}`}
        style={timeline ? { WebkitLineClamp: titleLines } : undefined}
      >
        {task.title}
      </span>
      {variant === "day" && (
        <GripVertical
          size={14}
          className="ml-auto shrink-0 text-[var(--v2-muted)] [@media(pointer:coarse)]:hidden"
          aria-hidden="true"
        />
      )}
    </span>
  );
  const details = (dueTime || (showStatusLabel && statusLabel)) && (
    <span className="flex w-full min-w-0 items-center gap-[5px]">
      {showStatusLabel && statusLabel && (
        <span className="v2-calendar-task-status truncate text-[10px]">
          {statusLabel}
        </span>
      )}
      {dueTime}
    </span>
  );

  return (
    <button
      type="button"
      title={cardLabel}
      {...props}
      ref={cardRef}
      draggable={canDrag}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task._id);
      }}
      className={`v2-calendar-task-card min-h-0 w-full min-w-0 text-left cursor-pointer ui-focus-ring motion-safe:transition-colors motion-safe:duration-200 [&[draggable=true]]:cursor-grab [&[draggable=true]:active]:cursor-grabbing ${timeline ? "overflow-clip" : "overflow-hidden"} ${variants[variant]}`}
      data-status={task.status}
      aria-label={cardLabel}
    >
      {timeline ? (
        <span className="sticky top-[calc(var(--v2-timeline-header-height,0px)_+_4px)] flex w-full min-w-0 flex-col gap-px">
          {heading}
          {details}
        </span>
      ) : (
        <>
          {heading}
          {compact ? dueTime : details}
        </>
      )}
    </button>
  );
}
