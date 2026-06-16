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
  actions,
}) => {
  const calendarDays = viewMode === 'week'
    ? buildWeekDays(currentDate)
    : buildMonthDays(currentDate);

  const today = startOfDay(new Date());
  const heading = viewMode === 'week'
    ? formatWeekLabel(currentDate)
    : formatMonthLabel(currentDate);

  return (
    <div className="ui-section-card ui-card-padding">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-accent)]">
            {viewMode === 'week' ? 'Week view' : 'Month view'}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{heading}</h2>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {showViewModeToggle && (
              <div className="inline-flex rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-1">
                <button
                  type="button"
                  onClick={() => onViewModeChange?.('month')}
                  className={`ui-focus-ring rounded-[calc(var(--radius-md)-2px)] px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${
                    viewMode === 'month'
                      ? 'bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[var(--shadow-xs)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange?.('week')}
                  className={`ui-focus-ring rounded-[calc(var(--radius-md)-2px)] px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-150 ${
                    viewMode === 'week'
                      ? 'bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[var(--shadow-xs)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
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
                className="ui-icon-button ui-focus-ring"
                aria-label={viewMode === 'week' ? 'Previous week' : 'Previous month'}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onResetToToday}
                className="ui-btn-secondary ui-focus-ring"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => onNavigate(1)}
                className="ui-icon-button ui-focus-ring"
                aria-label={viewMode === 'week' ? 'Next week' : 'Next month'}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {actions ? (
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-2">
        {WEEK_DAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-[var(--color-text-muted)] sm:text-sm"
          >
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
