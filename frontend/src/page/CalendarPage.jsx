import { useState, useEffect } from 'react';
import MainLayout from '../layout/MainLayout';
import CalendarView from '../feature/Calendar/CalendarView';
import ChatBubble from '../component/ChatBuble';
import { taskService } from '../api/apiService';
import { useTaskRefresh } from '../context/TaskRefreshContext';

const CalendarPage = () => {
  const { refreshTrigger } = useTaskRefresh();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial load
  useEffect(() => {
    fetchTasks();
  }, []);

  // Listen to refresh trigger from AI chat
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchTasks();
    }
  }, [refreshTrigger]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const allTasks = await taskService.getAllTasks();
      // Filter tasks that have dueDate
      const tasksWithDueDate = allTasks.filter(task => task.dueDate);
      setTasks(tasksWithDueDate);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
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
              <p className="text-gray-500 mb-2">View your tasks by deadline</p>
            </div>

            {/* Calendar View */}
            <CalendarView 
              tasks={tasks}
              onTaskUpdated={fetchTasks}
            />
          </div>
        </div>
      </MainLayout>

      <ChatBubble key="chat-bubble-stable" />
    </>
  );
};

export default CalendarPage;
