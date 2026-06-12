import { ChevronLeft, ChevronRight } from 'lucide-react';
import DayCell from './DayCell';
import {
  buildMonthDays,
  buildWeekDays,
  formatMonthLabel,
  formatWeekLabel,
  getDateKey,
  isSameDay,
  startOfDay,
} from './calendarUtils';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarGrid = ({
  currentDate,
  selectedDate,
  onDateSelect,
  onNavigate,
  onResetToToday,
  tasksByDate,
  onTaskUpdated,
  viewMode = 'month',
  showViewModeToggle = false,
  onViewModeChange,
}) => {
  const calendarDays = viewMode === 'week'
    ? buildWeekDays(currentDate)
    : buildMonthDays(currentDate);

  const today = startOfDay(new Date());
  const heading = viewMode === 'week'
    ? formatWeekLabel(currentDate)
    : formatMonthLabel(currentDate);

  return (
    <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-purple-600">
            {viewMode === 'week' ? 'Weekly zoom' : 'Monthly view'}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-900">{heading}</h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {showViewModeToggle && (
            <div className="inline-flex rounded-2xl bg-gray-100 p-1 shadow-inner">
              <button
                type="button"
                onClick={() => onViewModeChange?.('month')}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  viewMode === 'month'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange?.('week')}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  viewMode === 'week'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onNavigate(-1)}
              className="rounded-xl p-2 transition-colors hover:bg-gray-100"
              aria-label={viewMode === 'week' ? 'Previous week' : 'Previous month'}
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={onResetToToday}
              className="rounded-xl px-4 py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => onNavigate(1)}
              className="rounded-xl p-2 transition-colors hover:bg-gray-100"
              aria-label={viewMode === 'week' ? 'Next week' : 'Next month'}
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="py-2 text-center text-sm font-semibold text-gray-600">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map(({ date, isCurrentMonth }, index) => {
          const dateKey = getDateKey(date);
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const tasks = tasksByDate[dateKey] || [];

          return (
            <DayCell
              key={`${dateKey}-${index}`}
              day={date}
              isToday={isToday}
              isSelected={isSelected}
              isCurrentMonth={isCurrentMonth}
              tasks={tasks}
              onClick={onDateSelect}
              onTaskUpdated={onTaskUpdated}
              viewMode={viewMode}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
