import { useState, useEffect } from 'react';
import CalendarGrid from './CalendarGrid';
import TaskListPanel from './TaskListPanel';

const CalendarView = ({ tasks, onTaskUpdated }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasksByDate, setTasksByDate] = useState({});

  // Group tasks by date
  useEffect(() => {
    const grouped = {};
    
    tasks.forEach(task => {
      if (!task.dueDate) return;
      
      const date = new Date(task.dueDate);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });
    
    setTasksByDate(grouped);
  }, [tasks]);

  const handleMonthChange = (direction) => {
    if (direction === 0) {
      // Go to today
      const today = new Date();
      setCurrentDate(today);
      setSelectedDate(today);
    } else {
      // Move month
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + direction);
      setCurrentDate(newDate);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  // Get tasks for selected date
  const getSelectedDateKey = () => {
    if (!selectedDate) return '';
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  };

  const selectedTasks = tasksByDate[getSelectedDateKey()] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6 h-full">
      {/* Calendar - 70% */}
      <div className="h-full">
        <CalendarGrid
          currentDate={currentDate}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onMonthChange={handleMonthChange}
          tasksByDate={tasksByDate}
        />
      </div>

      {/* Task List - 30% */}
      <div className="h-full" style={{ maxHeight: 'calc(100vh - 150px)' }}>
        <TaskListPanel
          selectedDate={selectedDate}
          tasks={selectedTasks}
          onTaskUpdated={onTaskUpdated}
        />
      </div>
    </div>
  );
};

export default CalendarView;
