import { useState, useMemo } from 'react';
import CalendarGrid from './CalendarGrid';
import TaskListPanel from './TaskListPanel';

const CalendarView = ({ tasks, onTaskUpdated }) => {
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Group tasks by date using useMemo
  const tasksByDate = useMemo(() => {
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
    
    return grouped;
  }, [tasks]);

  const handleMonthChange = (direction) => {
    if (direction === 0) {
      // Go to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setCurrentDate(today);
      setSelectedDate(today);
    } else {
      // Move month - fix to prevent double jump
      setCurrentDate(prevDate => {
        const newDate = new Date(prevDate.getFullYear(), prevDate.getMonth() + direction, 1);
        return newDate;
      });
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  // Get tasks for selected date using useMemo
  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return tasksByDate[dateKey] || [];
  }, [selectedDate, tasksByDate]);

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
          onTaskUpdated={onTaskUpdated}
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
