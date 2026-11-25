import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { startOfDay } from "@/features/calendar/api/calendarRanges";
import { getLocale } from "@/shared/i18n";
import { getApiErrorMessage } from "@/shared/services/apiError";
import type { Task, TaskStatus } from "@/shared/types/domain";
import { groupTimelineTasks } from "../calendar/timelineData";
import { useTimelineTasks } from "../calendar/useTimelineTasks";

export interface CalendarTimelineProps {
  anchorDate: Date;
  onOpenTask: (taskId: string) => void;
}

const MAX_EMPTY_AUTO_WINDOWS = 3;
const SCROLL_PREFETCH_MARGIN_PX = 240;

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = {
  pending: Circle,
  "in-progress": Clock,
  completed: CheckCircle2,
  "given-up": XCircle,
};

function getStatusTranslationKey(status: TaskStatus): string {
  if (status === "in-progress") return "inProgress";
  if (status === "given-up") return "givenUp";
  return status;
}

function getLocalDayDiff(targetDay: Date, anchorDay: Date): number {
  const targetUtc = Date.UTC(
    targetDay.getFullYear(),
    targetDay.getMonth(),
    targetDay.getDate(),
  );
  const anchorUtc = Date.UTC(
    anchorDay.getFullYear(),
    anchorDay.getMonth(),
    anchorDay.getDate(),
  );
  return Math.round((targetUtc - anchorUtc) / 86_400_000);
}

export default function CalendarTimeline({
  anchorDate,
  onOpenTask,
}: CalendarTimelineProps) {
  const { t } = useTranslation("v2");
  const locale = getLocale();
  const normalizedAnchor = useMemo(() => startOfDay(anchorDate), [anchorDate]);

  const timelineQuery = useTimelineTasks(normalizedAnchor);
  const windows = useMemo(
    () => timelineQuery.data?.pages ?? [],
    [timelineQuery.data?.pages],
  );
  const hasLoadedWindows = windows.length > 0;
  const days = useMemo(() => groupTimelineTasks(windows), [windows]);
  const loadedTaskCount = useMemo(
    () => days.reduce((total, day) => total + day.tasks.length, 0),
    [days],
  );
  const lastCheckedDate = windows.at(-1)?.range.end;

  const trailingEmptyWindows = useMemo(() => {
    let count = 0;
    for (let index = windows.length - 1; index >= 0; index -= 1) {
      if (windows[index].tasks.length === 0) count += 1;
      else break;
    }
    return count;
  }, [windows]);

  const reachedEmptyAutoLimit = trailingEmptyWindows >= MAX_EMPTY_AUTO_WINDOWS;

  const fullDateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "full" }),
    [locale],
  );
  const mediumDateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale],
  );
  const shortDateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }),
    [locale],
  );
  const weekdayFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "long" }),
    [locale],
  );
  const monthYearFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }),
    [locale],
  );
  const timeFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { timeStyle: "short" }),
    [locale],
  );

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isSentinelInViewRef = useRef(false);
  const latestQueryRef = useRef({
    isFetching: timelineQuery.isFetching,
    isError: timelineQuery.isError,
    hasNextPage: Boolean(timelineQuery.hasNextPage),
    reachedEmptyAutoLimit,
    fetchNextPage: timelineQuery.fetchNextPage,
  });

  useEffect(() => {
    latestQueryRef.current = {
      isFetching: timelineQuery.isFetching,
      isError: timelineQuery.isError,
      hasNextPage: Boolean(timelineQuery.hasNextPage),
      reachedEmptyAutoLimit,
      fetchNextPage: timelineQuery.fetchNextPage,
    };
  });

  const maybeLoadMore = useCallback(() => {
    const {
      isFetching,
      isError,
      hasNextPage,
      reachedEmptyAutoLimit: atEmptyLimit,
      fetchNextPage,
    } = latestQueryRef.current;
    if (isFetching || isError || !hasNextPage || atEmptyLimit) return;
    void fetchNextPage({ cancelRefetch: false });
  }, []);

  useEffect(() => {
    if (!hasLoadedWindows) return;
    const node = sentinelRef.current;
    if (!node) return;

    isSentinelInViewRef.current = false;

    if (typeof IntersectionObserver === "function") {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (!entry) return;

          isSentinelInViewRef.current = entry.isIntersecting;
          if (entry.isIntersecting) {
            maybeLoadMore();
          }
        },
        { rootMargin: `0px 0px ${SCROLL_PREFETCH_MARGIN_PX}px 0px` },
      );

      observer.observe(node);
      return () => observer.disconnect();
    }

    const checkScrollPosition = () => {
      const rect = node.getBoundingClientRect();
      const inView =
        rect.top <=
        (window.innerHeight || document.documentElement.clientHeight) +
          SCROLL_PREFETCH_MARGIN_PX;
      isSentinelInViewRef.current = inView;
      if (inView) {
        maybeLoadMore();
      }
    };

    checkScrollPosition();
    window.addEventListener("scroll", checkScrollPosition, { passive: true });
    window.addEventListener("resize", checkScrollPosition, { passive: true });
    return () => {
      window.removeEventListener("scroll", checkScrollPosition);
      window.removeEventListener("resize", checkScrollPosition);
    };
  }, [hasLoadedWindows, normalizedAnchor, maybeLoadMore]);

  // If the sentinel remained in view after a sparse or empty window settled, continue seamlessly.
  useEffect(() => {
    if (
      hasLoadedWindows &&
      !timelineQuery.isFetching &&
      !timelineQuery.isError &&
      isSentinelInViewRef.current
    ) {
      maybeLoadMore();
    }
  }, [
    hasLoadedWindows,
    windows.length,
    timelineQuery.isFetching,
    timelineQuery.isError,
    maybeLoadMore,
  ]);

  const initialErrorMessage =
    timelineQuery.isError && !hasLoadedWindows
      ? getApiErrorMessage(timelineQuery.error, t("errorLoadingTasks"))
      : "";

  return (
    <section
      className="v2-agent-panel [border:1px_solid_var(--v2-glass-border)] rounded-[var(--v2-radius-card)] flex-col min-w-[0] min-h-[0] v2-calendar-panel gap-[18px]"
      data-testid="v2-calendar-timeline"
    >
      <div
        className="v2-calendar-toolbar flex items-center justify-between gap-[12px] flex-wrap
          [&_h2]:[font-family:var(--v2-font-heading)] [&_h2]:text-[20px] [&_h2]:[font-weight:600]
          [&_h2]:[letter-spacing:-0.01em]"
      >
        <h2>{t("timelineView")}</h2>
        <div className="flex flex-wrap items-center gap-[10px]">
          {lastCheckedDate && (
            <span className="inline-flex items-center rounded-[var(--v2-radius-pill)] border border-[var(--v2-border)] bg-[var(--v2-input-fill)] px-[10px] py-[4px] text-[12px] text-[var(--v2-muted)] tabular-nums">
              {t("timelineRangeChecked", {
                date: shortDateFormat.format(lastCheckedDate),
              })}
            </span>
          )}
          <span className="v2-calendar-count inline-flex items-center gap-[6px] text-[var(--v2-muted)] text-[12px] [font-variant-numeric:tabular-nums]">
            <CalendarDays size={15} aria-hidden="true" />
            {t("timelineLoadedCount", { count: loadedTaskCount })}
          </span>
        </div>
      </div>

      {timelineQuery.isLoading ? (
        <div
          className="v2-skills-status flex flex-col items-center gap-[12px] p-[36px_16px] text-[var(--v2-muted)] text-[13px] text-center"
          role="status"
        >
          <Loader2
            size={20}
            className="animate-spin text-[var(--v2-accent)]"
            aria-hidden="true"
          />
          <p>{t("timelineLoading")}</p>
        </div>
      ) : initialErrorMessage ? (
        <div
          className="v2-skills-status flex flex-col items-center gap-[12px] p-[36px_16px] text-[var(--v2-muted)] text-[13px] text-center"
          role="alert"
        >
          <AlertCircle
            size={22}
            className="text-[var(--v2-warning)]"
            aria-hidden="true"
          />
          <p className="text-[var(--v2-ink)] font-medium">
            {initialErrorMessage}
          </p>
          <button
            type="button"
            className="v2-btn"
            onClick={() => void timelineQuery.refetch()}
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>{t("retry")}</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-[18px]">
          {timelineQuery.isRefetchError && (
            <div
              className="flex flex-wrap items-center justify-between gap-[12px] rounded-[var(--v2-radius-control)] border border-[var(--v2-border)] bg-[var(--v2-input-fill)] px-[14px] py-[10px]"
              role="alert"
            >
              <p className="text-[13px] text-[var(--v2-ink)]">
                {t("timelineRefreshError")}
              </p>
              <button
                type="button"
                className="v2-btn min-h-[44px]"
                onClick={() => void timelineQuery.refetch()}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>{t("retry")}</span>
              </button>
            </div>
          )}

          {days.length > 0 ? (
            <div className="flex flex-col divide-y divide-[var(--v2-border)]">
              {days.map((day, index) => {
                const dayDiff = getLocalDayDiff(day.date, normalizedAnchor);
                const isToday = dayDiff === 0;
                const relativeLabel =
                  dayDiff === 0
                    ? t("today")
                    : dayDiff === 1
                      ? t("tomorrow")
                      : weekdayFormat.format(day.date);
                const taskCountLabel = t("timelineTaskCount", {
                  count: day.tasks.length,
                });
                const headingId = `timeline-day-${day.key}`;

                return (
                  <article
                    key={day.key}
                    className={`v2-timeline-day-group flex flex-col gap-[14px] ${
                      index === 0 ? "pt-[2px] pb-[20px]" : "py-[20px]"
                    } [@container_workspace_(min-width:850px)]:grid [@container_workspace_(min-width:850px)]:grid-cols-[192px_minmax(0,1fr)] [@container_workspace_(min-width:850px)]:items-start [@container_workspace_(min-width:850px)]:gap-[24px]`}
                  >
                    <h3
                      id={headingId}
                      className="v2-timeline-day-marker m-0 [@container_workspace_(min-width:850px)]:sticky [@container_workspace_(min-width:850px)]:top-[84px]"
                    >
                      <span className="sr-only">
                        {fullDateFormat.format(day.date)} · {taskCountLabel}
                      </span>
                      <span
                        aria-hidden="true"
                        className="flex flex-wrap items-baseline justify-between gap-x-[8px] gap-y-[6px] sm:gap-x-[12px] [@container_workspace_(min-width:850px)]:flex-col [@container_workspace_(min-width:850px)]:items-start [@container_workspace_(min-width:850px)]:gap-[6px]"
                      >
                        <span className="flex items-baseline gap-[8px] [@container_workspace_(min-width:850px)]:flex-col [@container_workspace_(min-width:850px)]:gap-[4px]">
                          <span
                            className={`inline-flex items-center gap-[6px] text-[11px] font-bold tracking-[0.09em] uppercase ${
                              isToday
                                ? "text-[var(--v2-accent)]"
                                : "text-[var(--v2-muted)]"
                            }`}
                          >
                            {isToday && (
                              <span className="h-[6px] w-[6px] rounded-full bg-[var(--v2-accent)]" />
                            )}
                            {relativeLabel}
                          </span>
                          <span
                            className={`[font-family:var(--v2-font-heading)] text-[28px] sm:text-[30px] leading-none font-semibold tabular-nums ${
                              isToday
                                ? "text-[var(--v2-accent)]"
                                : "text-[var(--v2-ink)]"
                            }`}
                          >
                            {day.date.getDate()}
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px] [@container_workspace_(min-width:850px)]:flex-col [@container_workspace_(min-width:850px)]:items-start">
                          <span className="text-[12px] sm:text-[13px] font-medium text-[var(--v2-ink)]/85">
                            {monthYearFormat.format(day.date)}
                          </span>
                          <span className="inline-flex items-center rounded-[var(--v2-radius-pill)] border border-[var(--v2-border)] bg-[var(--v2-shell-fill)] px-[8px] py-[2px] text-[11px] font-medium text-[var(--v2-muted)] tabular-nums">
                            {taskCountLabel}
                          </span>
                        </span>
                      </span>
                    </h3>

                    <ul
                      aria-labelledby={headingId}
                      className="v2-timeline-day-tasks m-0 flex min-w-[0] list-none flex-col gap-[10px] p-0"
                    >
                      {day.tasks.map((task: Task) => {
                        const taskId = task._id || task.id || "";
                        const StatusIcon = STATUS_ICONS[task.status] ?? Circle;
                        const statusText = t(
                          getStatusTranslationKey(task.status),
                        );
                        const priorityText = t(`priority${task.priority}`);
                        const formattedTime = task.dueDate
                          ? timeFormat.format(new Date(task.dueDate))
                          : "";
                        const hasDescription = Boolean(
                          task.description && task.description.trim(),
                        );

                        const statusBorderClass =
                          task.status === "completed"
                            ? "border-l-[3px] border-l-[var(--v2-success)]"
                            : task.status === "in-progress"
                              ? "border-l-[3px] border-l-[var(--v2-warning)]"
                              : task.status === "given-up"
                                ? "border-dashed opacity-85"
                                : "";

                        return (
                          <li key={taskId} className="min-w-[0]">
                            <button
                              type="button"
                              onClick={() => onOpenTask(taskId)}
                              className={`group flex min-h-[52px] w-full min-w-[0] cursor-pointer flex-col gap-[8px] rounded-[var(--v2-radius-control)] border border-[var(--v2-border)] bg-[var(--v2-input-fill)] px-[16px] py-[13px] text-left transition-colors duration-150 hover:border-[var(--v2-accent)] hover:bg-[var(--v2-shell-fill)] focus-visible:outline-2 focus-visible:outline-[var(--v2-accent)] focus-visible:outline-offset-[2px] sm:flex-row sm:items-start sm:justify-between sm:gap-[16px] [@media(prefers-reduced-motion:reduce)]:transition-none ${statusBorderClass}`}
                            >
                              <div className="flex min-w-[0] flex-1 flex-col gap-[6px] sm:flex-row sm:items-baseline sm:gap-[14px]">
                                {formattedTime && (
                                  <time
                                    dateTime={task.dueDate}
                                    className="shrink-0 text-[13px] font-semibold text-[var(--v2-accent)] tabular-nums sm:min-w-[70px]"
                                  >
                                    {formattedTime}
                                  </time>
                                )}
                                <div className="min-w-[0] flex-1">
                                  <p className="m-0 text-[15px] font-semibold leading-snug text-[var(--v2-ink)] wrap-anywhere group-hover:text-[var(--v2-accent)]">
                                    {task.title}
                                  </p>
                                  {hasDescription && (
                                    <p className="mt-[4px] mb-0 text-[13px] leading-relaxed text-[var(--v2-muted)] wrap-anywhere line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-wrap items-center gap-[8px] sm:justify-end">
                                <span
                                  data-status={task.status}
                                  className="v2-status inline-flex items-center gap-[5px] rounded-[var(--v2-radius-pill)] border border-[var(--v2-border)] bg-[var(--v2-shell-fill)] px-[9px] py-[3px] text-[11px] font-semibold whitespace-nowrap"
                                >
                                  <StatusIcon size={12} aria-hidden="true" />
                                  <span>{statusText}</span>
                                </span>

                                <span
                                  data-priority={task.priority}
                                  className="v2-task-priority inline-flex items-center gap-[6px] rounded-[var(--v2-radius-pill)] border border-[var(--v2-border)] bg-[var(--v2-surface-solid)]/60 px-[9px] py-[3px] text-[11px] font-medium text-[var(--v2-muted)] whitespace-nowrap [&_>_span:first-child]:h-[6px] [&_>_span:first-child]:w-[6px] [&_>_span:first-child]:shrink-0 [&_>_span:first-child]:rounded-full [&_>_span:first-child]:bg-[var(--v2-muted)] [&[data-priority=High]_>_span:first-child]:bg-[var(--v2-warning)] [&[data-priority=Urgent]_>_span:first-child]:bg-[var(--v2-warning)]"
                                >
                                  <span aria-hidden="true" />
                                  {priorityText}
                                </span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-[8px] rounded-[var(--v2-radius-control)] border border-dashed border-[var(--v2-border)] bg-[var(--v2-input-fill)] px-[20px] py-[32px] text-center">
              <CalendarDays
                size={24}
                className="text-[var(--v2-muted)]"
                aria-hidden="true"
              />
              <p className="m-0 text-[14px] font-semibold text-[var(--v2-ink)]">
                {t("timelineEmptyTitle")}
              </p>
              {lastCheckedDate && (
                <p className="m-0 max-w-[420px] text-[13px] text-[var(--v2-muted)]">
                  {t("timelineEmptyDescription", {
                    date: mediumDateFormat.format(lastCheckedDate),
                  })}
                </p>
              )}
            </div>
          )}

          {timelineQuery.isFetchNextPageError && (
            <div
              className="flex flex-wrap items-center justify-between gap-[12px] rounded-[var(--v2-radius-control)] border border-[var(--v2-border)] bg-[var(--v2-input-fill)] px-[14px] py-[10px]"
              role="alert"
            >
              <p className="text-[13px] text-[var(--v2-ink)]">
                {t("timelineLoadMoreError")}
              </p>
              <button
                type="button"
                className="v2-btn min-h-[44px]"
                onClick={() =>
                  void timelineQuery.fetchNextPage({ cancelRefetch: false })
                }
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>{t("retry")}</span>
              </button>
            </div>
          )}

          <div className="flex flex-col items-center gap-[8px] pt-[6px]">
            <div
              ref={sentinelRef}
              className="h-[1px] w-full"
              aria-hidden="true"
            />
            {timelineQuery.isFetchingNextPage && (
              <div
                className="inline-flex items-center gap-[8px] py-[8px] text-[13px] text-[var(--v2-muted)]"
                role="status"
              >
                <Loader2
                  size={15}
                  className="animate-spin text-[var(--v2-accent)]"
                  aria-hidden="true"
                />
                <span>{t("timelineLoadingMore")}</span>
              </div>
            )}
            {reachedEmptyAutoLimit &&
              days.length > 0 &&
              !timelineQuery.isFetching &&
              !timelineQuery.isError &&
              lastCheckedDate && (
                <p className="m-0 py-[6px] text-center text-[12px] text-[var(--v2-muted)]">
                  {t("timelineEndReached", {
                    date: mediumDateFormat.format(lastCheckedDate),
                  })}
                </p>
              )}
          </div>
        </div>
      )}
    </section>
  );
}
