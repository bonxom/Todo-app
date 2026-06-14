import { useCallback, useEffect, useState } from 'react';
import MainLayout from '../layout/MainLayout';
import CalendarView from '../feature/Calendar/CalendarView';
import ChatBubble from '../component/ChatBuble';
import { projectService, taskService } from '../api/apiService';
import { useTaskRefresh } from '../context/useTaskRefresh';

const CalendarPage = () => {
  const { refreshTrigger } = useTaskRefresh();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchCalendarData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const [allTasks, allProjects] = await Promise.all([
        taskService.getAllTasks(),
        projectService.getAllProjects(),
      ]);

      const tasksWithDueDate = allTasks.filter(task => task.dueDate);
      setTasks(tasksWithDueDate);
      setProjects(allProjects || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to load calendar data.');
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchCalendarData();
    }
  }, [fetchCalendarData, refreshTrigger]);

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
        <div className="ui-page-shell">
          <header className="ui-page-header">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="ui-page-kicker">Planning View</p>
                <h1 className="ui-page-title">Calendar</h1>
                <p className="ui-page-description">
                  See due work by week or month, then narrow the board to the projects that matter right now.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="ui-chip ui-tabular">Week default</span>
                <span className="ui-chip">Standalone tasks stay visible</span>
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
                  onClick={fetchCalendarData}
                  className="ui-btn-secondary ui-focus-ring"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <CalendarView
              tasks={tasks}
              projects={projects}
              onTaskUpdated={fetchCalendarData}
            />
          )}
        </div>
      </MainLayout>

      <ChatBubble key="chat-bubble-stable" />
    </>
  );
};

export default CalendarPage;
