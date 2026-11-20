import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import CalendarView from "./components/CalendarView";
import { useCalendarTasksQuery } from "@/features/tasks/api/taskQueries";
import { useProjectsQuery } from "@/features/tasks/api/projectQueries";
import { useCalendarMutations } from "./api/useCalendarMutations";
import { useVisibleTasks } from "@/stores/useTaskFilterStore";
import {
  getBufferedCalendarRange,
  getVisibleCalendarRange,
  startOfDay,
  taskHasDueDateInRange,
} from "./api/calendarRanges";
import { getApiErrorMessage } from "@/shared/services/apiError";

const CalendarPage = () => {
  const { t } = useTranslation("workspace");

  const today = useMemo(() => startOfDay(new Date()), []);
  const [currentDate, setCurrentDate] = useState(today);
  const [viewMode, setViewMode] = useState("week");

  const bufferedRange = useMemo(
    () => getBufferedCalendarRange(currentDate, viewMode),
    [currentDate, viewMode],
  );

  const visibleRange = useMemo(
    () => getVisibleCalendarRange(currentDate, viewMode),
    [currentDate, viewMode],
  );

  const tasksQuery = useCalendarTasksQuery({
    startDate: bufferedRange.startIso,
    endDate: bufferedRange.endIso,
  });

  const projectsQuery = useProjectsQuery();
  const calendarMutations = useCalendarMutations();

  const rawTasks = tasksQuery.data || [];
  const projects = projectsQuery.data || [];

  const visibleTasks = useVisibleTasks(rawTasks);
  const renderedTasks = useMemo(
    () =>
      visibleTasks.filter((task) => taskHasDueDateInRange(task, visibleRange)),
    [visibleRange, visibleTasks],
  );

  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading;
  const errorMessage = tasksQuery.isError
    ? getApiErrorMessage(tasksQuery.error, t("failedToLoadCalendarTasks"))
    : projectsQuery.isError
      ? getApiErrorMessage(projectsQuery.error, t("failedToLoadProjects"))
      : "";

  const handleTaskStatusChange = async (task, nextStatus) => {
    try {
      await calendarMutations.changeTaskStatus(task, nextStatus);
    } catch (error) {
      console.error("Failed to update task status:", error);
      alert(getApiErrorMessage(error, t("failedToUpdateTaskStatus")));
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      await calendarMutations.deleteTask(taskId);
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert(getApiErrorMessage(error, t("failedToDeleteTask")));
    }
  };

  const handleTaskDueDateChange = async (taskId, nextDueDate) => {
    try {
      const task = rawTasks.find((t) => (t._id || t.id) === taskId);
      if (!task) return;
      await calendarMutations.changeTaskDueDate(task, nextDueDate);
    } catch (error) {
      console.error("Failed to update task deadline:", error);
      alert(getApiErrorMessage(error, t("failedToUpdateTaskDeadline")));
    }
  };

  const handleTaskDatesChange = async (taskId, dates) => {
    const task = rawTasks.find((task) => (task._id || task.id) === taskId);
    if (!task) throw new Error("Task not found");
    return calendarMutations.changeTaskDates(task, dates);
  };

  const handleTaskCopy = async (taskCopyPayload, nextDueDate) => {
    try {
      await calendarMutations.copyTask(taskCopyPayload, nextDueDate);
    } catch (error) {
      console.error("Failed to copy task:", error);
      alert(getApiErrorMessage(error, t("failedToCopyTask")));
    }
  };

  const handleProjectStatusChange = async (projectId, status) => {
    try {
      await calendarMutations.changeProjectStatus(projectId, status);
    } catch (error) {
      console.error("Failed to update project status:", error);
      alert(getApiErrorMessage(error, t("failedToUpdateProjectStatus")));
    }
  };

  if (isLoading) {
    return (
      <div
        className="ui-page-shell mx-auto calendar-page-shell [&_.calendar-weekdays]:grid-cols-[repeat(7,minmax(0,1fr))]
        [&_.calendar-days]:grid-cols-[repeat(7,minmax(0,1fr))] [&_.calendar-days_>_.calendar-day]:rounded-[0]
        [&_.calendar-days_>_.calendar-day]:min-w-[0] [&_.calendar-days_>_.calendar-day]:[box-shadow:none]
        [&_.calendar-days_>_.calendar-day]:align-top
        [&_.calendar-days_>_.calendar-day[data-selected=true]]:[box-shadow:inset_0_3px_var(--color-accent)]
        [&_[data-cal-task-card]]:rounded-[5px] [&_[data-cal-task-card]]:[box-shadow:none]
        [&_[data-cal-task-name]]:whitespace-normal [&_[data-cal-task-name]]:[-webkit-line-clamp:2]
        [&_[data-cal-task-name]]:[-webkit-box-orient:vertical]
        [@media(max-width:650px)]:[&_.calendar-board[data-view=month]_[data-cal-task-card]]:opacity-[0.55]
        [&_.calendar-timeline-task]:absolute [&_.calendar-timeline-task]:items-stretch
        [&_.calendar-timeline-task]:justify-start [&_.calendar-timeline-task]:[scroll-margin-top:80px]
        [&_.calendar-timeline-task]:text-left [&_.calendar-timeline-task]:[border-left-width:3px]
        [&_.calendar-timeline-task]:overflow-clip
        [&_.calendar-timeline-task_[data-cal-task-name]]:[-webkit-line-clamp:var(--timeline-title-lines,2)]
        [&_.calendar-timeline-task_[data-cal-task-name]]:overflow-hidden
        [&_.calendar-timeline-task_[data-cal-task-name]]:wrap-anywhere
        [&_.calendar-timeline-event_.calendar-timeline-task]:relative"
        aria-busy="true"
      >
        <header className="ui-workspace-heading flex items-center justify-between">
          <h1 className="ui-page-title m-[0] text-[var(--color-text)] [font-weight:650] text-balance">
            {t("calendar")}
          </h1>
        </header>
        <div
          className="calendar-loading text-[var(--color-text-muted)] text-[12px]"
          role="status"
        >
          <div className="calendar-loading-summary h-[175px] [background:var(--color-accent-soft)] rounded-[18px] mb-[24px]" />
          <p>{t("loadingYourSchedule")}</p>
          <div
            className="calendar-loading-grid mt-[16px] grid grid-cols-[repeat(7,1fr)] min-h-[260px]
            [border:1px_solid_var(--color-line)] rounded-[14px] overflow-hidden
            [&_>_div]:[background:var(--color-surface)] [&_>_div]:[border-right:1px_solid_var(--color-line)]
            [&_>_div:last-child]:[border:0]"
          >
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="ui-page-shell mx-auto calendar-page-shell [&_.calendar-weekdays]:grid-cols-[repeat(7,minmax(0,1fr))]
      [&_.calendar-days]:grid-cols-[repeat(7,minmax(0,1fr))] [&_.calendar-days_>_.calendar-day]:rounded-[0]
      [&_.calendar-days_>_.calendar-day]:min-w-[0] [&_.calendar-days_>_.calendar-day]:[box-shadow:none]
      [&_.calendar-days_>_.calendar-day]:align-top
      [&_.calendar-days_>_.calendar-day[data-selected=true]]:[box-shadow:inset_0_3px_var(--color-accent)]
      [&_[data-cal-task-card]]:rounded-[5px] [&_[data-cal-task-card]]:[box-shadow:none]
      [&_[data-cal-task-name]]:whitespace-normal [&_[data-cal-task-name]]:[-webkit-line-clamp:2]
      [&_[data-cal-task-name]]:[-webkit-box-orient:vertical]
      [@media(max-width:650px)]:[&_.calendar-board[data-view=month]_[data-cal-task-card]]:opacity-[0.55]
      [&_.calendar-timeline-task]:absolute [&_.calendar-timeline-task]:items-stretch
      [&_.calendar-timeline-task]:justify-start [&_.calendar-timeline-task]:[scroll-margin-top:80px]
      [&_.calendar-timeline-task]:text-left [&_.calendar-timeline-task]:[border-left-width:3px]
      [&_.calendar-timeline-task]:overflow-clip
      [&_.calendar-timeline-task_[data-cal-task-name]]:[-webkit-line-clamp:var(--timeline-title-lines,2)]
      [&_.calendar-timeline-task_[data-cal-task-name]]:overflow-hidden
      [&_.calendar-timeline-task_[data-cal-task-name]]:wrap-anywhere
      [&_.calendar-timeline-event_.calendar-timeline-task]:relative"
    >
      {errorMessage && (
        <header className="ui-workspace-heading flex items-center justify-between">
          <h1 className="ui-page-title m-[0] text-[var(--color-text)] [font-weight:650] text-balance">
            {t("calendar")}
          </h1>
        </header>
      )}
      {errorMessage ? (
        <div className="ui-section-card ui-card-padding p-[clamp(1rem,2vw,1.5rem)] text-center">
          <p className="text-lg font-semibold text-[var(--color-danger)]">
            {t("unableToLoadTheCalendar")}
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {errorMessage}
          </p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => {
                tasksQuery.refetch();
                projectsQuery.refetch();
              }}
              className="ui-btn-secondary ui-focus-ring"
            >
              {t("tryAgain")}
            </button>
          </div>
        </div>
      ) : (
        <CalendarView
          tasks={renderedTasks}
          projects={projects}
          currentDate={currentDate}
          viewMode={viewMode}
          isRangeLoading={tasksQuery.isFetching}
          onCurrentDateChange={setCurrentDate}
          onViewModeChange={setViewMode}
          onTaskUpdated={() => {
            tasksQuery.refetch();
            projectsQuery.refetch();
          }}
          onTaskStatusChange={handleTaskStatusChange}
          onTaskDelete={handleTaskDelete}
          onTaskDueDateChange={handleTaskDueDateChange}
          onTaskDatesChange={handleTaskDatesChange}
          onTaskCopy={handleTaskCopy}
          onProjectStatusChange={handleProjectStatusChange}
        />
      )}
    </div>
  );
};

export default CalendarPage;
