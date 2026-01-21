import { ChevronLeft, ChevronRight } from 'lucide-react';
import DayCell from './DayCell';

const CalendarGrid = ({ currentDate, selectedDate, onDateSelect, onMonthChange, tasksByDate, onTaskUpdated }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Get days from previous month to fill first week
  const daysFromPrevMonth = startingDayOfWeek;
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Calculate total cells needed
  const totalCells = Math.ceil((daysInMonth + daysFromPrevMonth) / 7) * 7;
  const daysFromNextMonth = totalCells - (daysInMonth + daysFromPrevMonth);

  // Build calendar days array
  const calendarDays = [];

  // Previous month days
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const day = new Date(year, month - 1, prevMonthLastDay - i);
    calendarDays.push({ date: day, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(year, month, i);
    calendarDays.push({ date: day, isCurrentMonth: true });
  }

  // Next month days
  for (let i = 1; i <= daysFromNextMonth; i++) {
    const day = new Date(year, month + 1, i);
    calendarDays.push({ date: day, isCurrentMonth: false });
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => onMonthChange(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => onMonthChange(0)}
            className="px-3 py-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors text-sm font-medium"
          >
            Today
          </button>
          <button
            onClick={() => onMonthChange(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map(({ date, isCurrentMonth }, index) => {
          const dateKey = getDateKey(date);
          const isToday = date.getTime() === today.getTime();
          const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
          const tasks = tasksByDate[dateKey] || [];

          return (
            <DayCell
              key={index}
              day={date}
              isToday={isToday}
              isSelected={isSelected}
              isCurrentMonth={isCurrentMonth}
              tasks={tasks}
              onClick={onDateSelect}
              onTaskUpdated={onTaskUpdated}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
