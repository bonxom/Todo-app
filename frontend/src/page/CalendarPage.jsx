import { useCallback, useEffect, useMemo, useState } from 'react';
import MainLayout from '../layout/MainLayout';
import CalendarView from '../feature/Calendar/CalendarView';
import ChatBubble from '../component/ChatBuble';
import { projectService, taskService } from '../api/apiService';
import { useTaskRefresh } from '../context/useTaskRefresh';
import { useVisibleTasks } from '../context/useTaskFilter';
import { addDays, buildMonthDays, buildWeekDays, startOfDay } from '../feature/Calendar/calendarUtils';

const getTaskId = (task) => task?._id || task?.id || null;

const addMonths = (value, amount) => {
  const date = startOfDay(value);
  date.setMonth(date.getMonth() + amount);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getBufferedCalendarRange = (currentDate, viewMode) => {
  if (viewMode === 'month') {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    return {
      start: startOfDay(addMonths(monthStart, -1)),
      end: endOfDay(addMonths(monthEnd, 1)),
    };
  }

  const weekDays = buildWeekDays(currentDate);
  return {
    start: startOfDay(addDays(weekDays[0].date, -7)),
    end: endOfDay(addDays(weekDays[weekDays.length - 1].date, 7)),
  };
};

const getVisibleCalendarRange = (currentDate, viewMode) => {
  const days = viewMode === 'month'
    ? buildMonthDays(currentDate)
    : buildWeekDays(currentDate);

  return {
    start: startOfDay(days[0].date),
    end: endOfDay(days[days.length - 1].date),
  };
};

const isRangeCovered = (cachedRanges, targetRange) => {
  const targetStart = targetRange.start.getTime();
  const targetEnd = targetRange.end.getTime();
  const sortedRanges = cachedRanges
    .map((range) => ({ start: new Date(range.start).getTime(), end: new Date(range.end).getTime() }))
    .filter((range) => !Number.isNaN(range.start) && !Number.isNaN(range.end))
    .sort((left, right) => left.start - right.start);

  let coveredUntil = targetStart;

  for (const range of sortedRanges) {
    if (range.end < coveredUntil) {
      continue;
    }

    if (range.start > coveredUntil) {
      return false;
    }

    coveredUntil = Math.max(coveredUntil, range.end);
    if (coveredUntil >= targetEnd) {
      return true;
    }
  }

  return false;
};

const taskHasDueDateInRange = (task, range) => {
  if (!task?.dueDate) return false;
  const dueTime = new Date(task.dueDate).getTime();
  return !Number.isNaN(dueTime) && dueTime >= range.start.getTime() && dueTime <= range.end.getTime();
};

const mergeTasksById = (currentTasks, nextTasks) => {
  const taskMap = new Map();

  currentTasks.forEach((task) => {
    const taskId = getTaskId(task);
    if (taskId) {
      taskMap.set(taskId, task);
    }
  });

  nextTasks.forEach((task) => {
    const taskId = getTaskId(task);
    if (taskId) {
      taskMap.set(taskId, task);
    }
  });

  return Array.from(taskMap.values());
};

const replaceTask = (tasks, nextTask, previousId) => {
  const nextTaskId = getTaskId(nextTask);
  if (!nextTaskId) return tasks;

  const filteredTasks = tasks.filter((task) => {
    const taskId = getTaskId(task);
    return taskId !== nextTaskId && (!previousId || taskId !== previousId);
  });

  return nextTask.dueDate ? mergeTasksById(filteredTasks, [nextTask]) : filteredTasks;
};

const extractTask = (response) => response?.task || response;

const CalendarPage = () => {
  const { refreshTrigger } = useTaskRefresh();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [currentDate, setCurrentDate] = useState(today);
  const [viewMode, setViewMode] = useState('week');
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [cachedRanges, setCachedRanges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const visibleRange = useMemo(
    () => getVisibleCalendarRange(currentDate, viewMode),
    [currentDate, viewMode]
  );

  const fetchProjects = useCallback(async () => {
    const allProjects = await projectService.getAllProjects();
    setProjects(allProjects || []);
  }, []);

  const fetchTaskRange = useCallback(async (range, { force = false } = {}) => {
    if (!force && isRangeCovered(cachedRanges, range)) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const rangeTasks = await taskService.getTasksByDateRange(
        range.start.toISOString(),
        range.end.toISOString()
      );

      setTasks((previousTasks) => {
        const tasksOutsideRange = previousTasks.filter((task) => !taskHasDueDateInRange(task, range));
        return mergeTasksById(tasksOutsideRange, Array.isArray(rangeTasks) ? rangeTasks : []);
      });
      setCachedRanges((previousRanges) => [
        ...previousRanges,
        {
          start: range.start.toISOString(),
          end: range.end.toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to load calendar data.');
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [cachedRanges]);

  const fetchCalendarData = useCallback(async ({ force = false } = {}) => {
    const range = getBufferedCalendarRange(currentDate, viewMode);

    if (force) {
      setCachedRanges([]);
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      await Promise.all([
        fetchTaskRange(range, { force }),
        fetchProjects(),
      ]);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to load calendar data.');
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [currentDate, fetchProjects, fetchTaskRange, viewMode]);

  useEffect(() => {
    const range = getBufferedCalendarRange(currentDate, viewMode);
    fetchTaskRange(range);
  }, [currentDate, fetchTaskRange, viewMode]);

  useEffect(() => {
    fetchProjects().catch((error) => {
      console.error('Error fetching projects:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to load project data.');
      setIsInitialLoad(false);
      setIsLoading(false);
    });
  }, [fetchProjects]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchCalendarData({ force: true });
    }
  }, [fetchCalendarData, refreshTrigger]);

  const updateTaskInCache = useCallback((nextTask, previousId) => {
    setTasks((previousTasks) => replaceTask(previousTasks, nextTask, previousId));
  }, []);

  const removeTaskFromCache = useCallback((taskId) => {
    setTasks((previousTasks) => previousTasks.filter((task) => getTaskId(task) !== taskId));
  }, []);

  const refreshProjectSummaries = useCallback(async () => {
    try {
      await fetchProjects();
    } catch (error) {
      console.error('Failed to refresh project summaries:', error);
    }
  }, [fetchProjects]);

  const runCalendarMutation = useCallback(async ({
    apply,
    request,
    commit,
    rollbackMessage,
    refreshProjects: shouldRefreshProjects = false,
  }) => {
    const taskSnapshot = tasks;
    const projectSnapshot = projects;

    try {
      apply?.();
      const response = await request();
      commit?.(response);
      if (shouldRefreshProjects) {
        await refreshProjectSummaries();
      }
      return response;
    } catch (error) {
      setTasks(taskSnapshot);
      setProjects(projectSnapshot);
      console.error(rollbackMessage, error);
      alert(error.message || rollbackMessage);
      throw error;
    }
  }, [projects, refreshProjectSummaries, tasks]);

  const handleTaskStatusChange = useCallback(async (task, nextStatus) => {
    const taskId = getTaskId(task);
    if (!taskId) return;

    const now = new Date().toISOString();
    const optimisticTask = {
      ...task,
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? now : nextStatus === 'in-progress' ? null : task.completedAt,
    };

    const requestByStatus = {
      completed: () => taskService.finishTask(taskId),
      'in-progress': () => (task.status === 'pending' ? taskService.startTask(taskId) : taskService.restoreTask(taskId)),
      'given-up': () => taskService.giveUpTask(taskId),
    };

    await runCalendarMutation({
      apply: () => updateTaskInCache(optimisticTask),
      request: requestByStatus[nextStatus],
      commit: (response) => updateTaskInCache(extractTask(response)),
      rollbackMessage: 'Failed to update task status.',
      refreshProjects: true,
    });
  }, [runCalendarMutation, updateTaskInCache]);

  const handleTaskDelete = useCallback(async (taskId) => {
    await runCalendarMutation({
      apply: () => removeTaskFromCache(taskId),
      request: () => taskService.deleteTask(taskId),
      rollbackMessage: 'Failed to delete task.',
      refreshProjects: true,
    });
  }, [removeTaskFromCache, runCalendarMutation]);

  const handleTaskDueDateChange = useCallback(async (taskId, nextDueDate) => {
    const existingTask = tasks.find((task) => getTaskId(task) === taskId);
    if (!existingTask) return;

    await runCalendarMutation({
      apply: () => updateTaskInCache({ ...existingTask, dueDate: nextDueDate }),
      request: () => taskService.updateTask(taskId, { dueDate: nextDueDate }),
      commit: (response) => updateTaskInCache(extractTask(response)),
      rollbackMessage: 'Failed to update task deadline.',
      refreshProjects: true,
    });
  }, [runCalendarMutation, tasks, updateTaskInCache]);

  const handleTaskCopy = useCallback(async (taskCopyPayload, nextDueDate) => {
    const temporaryId = `optimistic-${Date.now()}`;
    const optimisticTask = {
      ...taskCopyPayload,
      _id: temporaryId,
      status: 'in-progress',
      dueDate: nextDueDate,
      completedAt: null,
    };

    await runCalendarMutation({
      apply: () => updateTaskInCache(optimisticTask),
      request: () => taskService.createTask({
        ...taskCopyPayload,
        status: 'in-progress',
        dueDate: nextDueDate,
      }),
      commit: (response) => updateTaskInCache(extractTask(response), temporaryId),
      rollbackMessage: 'Failed to copy task.',
      refreshProjects: true,
    });
  }, [runCalendarMutation, updateTaskInCache]);

  const handleProjectStatusChange = useCallback(async (projectId, status) => {
    const existingProject = projects.find((project) => project._id === projectId);
    if (!existingProject) return;

    await runCalendarMutation({
      apply: () => {
        setProjects((previousProjects) => previousProjects.map((project) => (
          project._id === projectId ? { ...project, status } : project
        )));
      },
      request: () => projectService.updateProject(projectId, { status }),
      commit: (updatedProject) => {
        setProjects((previousProjects) => previousProjects.map((project) => (
          project._id === projectId ? updatedProject : project
        )));
      },
      rollbackMessage: status === 'completed' ? 'Failed to complete project.' : 'Failed to restore project.',
    });
  }, [projects, runCalendarMutation]);

  const visibleTasks = useVisibleTasks(tasks);
  const renderedTasks = useMemo(
    () => visibleTasks.filter((task) => taskHasDueDateInRange(task, visibleRange)),
    [visibleRange, visibleTasks]
  );

  if (isInitialLoad && isLoading) {
    return (
      <>
        <MainLayout>
          <div className="ui-page-shell flex min-h-full items-center justify-center">
            <div className="text-sm text-[var(--color-text-muted)]">Loading calendar…</div>
          </div>
        </MainLayout>
        <ChatBubble key="chat-bubble-stable" />
      </>
    );
  }

  return (
    <>
      <MainLayout>
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
                  onClick={() => fetchCalendarData({ force: true })}
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
              onCurrentDateChange={setCurrentDate}
              onViewModeChange={setViewMode}
              onTaskUpdated={() => fetchCalendarData({ force: true })}
              onTaskStatusChange={handleTaskStatusChange}
              onTaskDelete={handleTaskDelete}
              onTaskDueDateChange={handleTaskDueDateChange}
              onTaskCopy={handleTaskCopy}
              onProjectStatusChange={handleProjectStatusChange}
            />
          )}
        </div>
      </MainLayout>

      <ChatBubble key="chat-bubble-stable" />
    </>
  );
};

export default CalendarPage;
