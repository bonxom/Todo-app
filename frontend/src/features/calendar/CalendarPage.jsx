import { useMemo, useState } from 'react';
import CalendarView from './components/CalendarView';
import { useCalendarTasksQuery } from '@/features/tasks/api/taskQueries';
import { useProjectsQuery } from '@/features/tasks/api/projectQueries';
import { useCalendarMutations } from './api/useCalendarMutations';
import { useVisibleTasks } from '@/stores/useTaskFilterStore';
import {
  getBufferedCalendarRange,
  getVisibleCalendarRange,
  startOfDay,
  taskHasDueDateInRange,
} from './api/calendarRanges';
import { getApiErrorMessage } from '@/shared/services/apiError';

const CalendarPage = () => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [currentDate, setCurrentDate] = useState(today);
  const [viewMode, setViewMode] = useState('week');

  const bufferedRange = useMemo(
    () => getBufferedCalendarRange(currentDate, viewMode),
    [currentDate, viewMode]
  );

  const visibleRange = useMemo(
    () => getVisibleCalendarRange(currentDate, viewMode),
    [currentDate, viewMode]
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
    () => visibleTasks.filter((task) => taskHasDueDateInRange(task, visibleRange)),
    [visibleRange, visibleTasks]
  );

  const isLoading = tasksQuery.isLoading || projectsQuery.isLoading;
  const errorMessage = tasksQuery.isError
    ? getApiErrorMessage(tasksQuery.error, 'Failed to load calendar tasks.')
    : projectsQuery.isError
    ? getApiErrorMessage(projectsQuery.error, 'Failed to load projects.')
    : '';

  const handleTaskStatusChange = async (task, nextStatus) => {
    try {
      await calendarMutations.changeTaskStatus(task, nextStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
      alert(getApiErrorMessage(error, 'Failed to update task status.'));
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      await calendarMutations.deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert(getApiErrorMessage(error, 'Failed to delete task.'));
    }
  };

  const handleTaskDueDateChange = async (taskId, nextDueDate) => {
    try {
      const task = rawTasks.find((t) => (t._id || t.id) === taskId);
      if (!task) return;
      await calendarMutations.changeTaskDueDate(task, nextDueDate);
    } catch (error) {
      console.error('Failed to update task deadline:', error);
      alert(getApiErrorMessage(error, 'Failed to update task deadline.'));
    }
  };

  const handleTaskCopy = async (taskCopyPayload, nextDueDate) => {
    try {
      await calendarMutations.copyTask(taskCopyPayload, nextDueDate);
    } catch (error) {
      console.error('Failed to copy task:', error);
      alert(getApiErrorMessage(error, 'Failed to copy task.'));
    }
  };

  const handleProjectStatusChange = async (projectId, status) => {
    try {
      await calendarMutations.changeProjectStatus(projectId, status);
    } catch (error) {
      console.error('Failed to update project status:', error);
      alert(getApiErrorMessage(error, 'Failed to update project status.'));
    }
  };

  if (isLoading) {
    return (
      <div className="ui-page-shell flex min-h-full items-center justify-center">
        <div className="text-sm text-[var(--color-text-muted)]">Loading calendar…</div>
      </div>
    );
  }

  return (
    <div className="ui-page-shell calendar-page-shell">
      <header className="ui-page-header">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="ui-page-kicker">Planning View</p>
            <h1 className="ui-page-title">Calendar</h1>
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="ui-section-card ui-card-padding text-center">
          <p className="text-lg font-semibold text-[var(--color-danger)]">Unable to load the calendar</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{errorMessage}</p>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => {
                tasksQuery.refetch();
                projectsQuery.refetch();
              }}
              className="ui-btn-secondary ui-focus-ring"
            >
              Try Again
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
          onTaskCopy={handleTaskCopy}
          onProjectStatusChange={handleProjectStatusChange}
        />
      )}
    </div>
  );
};

export default CalendarPage;
