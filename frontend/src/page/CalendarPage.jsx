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
          <div className="flex justify-center items-center min-h-full">
            <div className="text-gray-500">Loading calendar...</div>
          </div>
        </MainLayout>
        <ChatBubble key="chat-bubble-stable" />
      </>
    );
  }

  return (
    <>
      <MainLayout>
        <div className="flex justify-center items-start min-h-full p-6">
          <div className="w-full max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Calendar
              </h1>
              <p className="text-gray-500 mb-2">View scheduled work by deadline, or narrow the board to specific projects.</p>
            </div>

            {errorMessage ? (
              <div className="rounded-[2rem] border border-red-200 bg-red-50/80 px-6 py-10 text-center">
                <p className="text-lg font-semibold text-red-700">Unable to load the calendar</p>
                <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                <button
                  type="button"
                  onClick={fetchCalendarData}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl border border-red-300 bg-white px-5 text-sm font-medium text-red-700 transition-all hover:bg-red-50"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <CalendarView
                tasks={tasks}
                projects={projects}
                onTaskUpdated={fetchCalendarData}
              />
            )}
          </div>
        </div>
      </MainLayout>

      <ChatBubble key="chat-bubble-stable" />
    </>
  );
};

export default CalendarPage;
