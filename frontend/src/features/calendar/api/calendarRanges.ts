export type CalendarViewMode = "week" | "month";

export interface CalendarRange {
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
}

export const startOfDay = (value: Date | string | number): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const endOfDay = (value: Date | string | number): Date => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

export const addDays = (value: Date | string | number, amount: number): Date => {
  const date = startOfDay(value);
  date.setDate(date.getDate() + amount);
  return date;
};

export const addMonths = (value: Date | string | number, amount: number): Date => {
  const date = startOfDay(value);
  date.setMonth(date.getMonth() + amount);
  return date;
};

export const getStartOfWeek = (value: Date | string | number): Date => {
  const date = startOfDay(value);
  date.setDate(date.getDate() - date.getDay());
  return date;
};

export const buildWeekDays = (currentDate: Date): Array<{ date: Date; isCurrentMonth: boolean }> => {
  const weekStart = getStartOfWeek(currentDate);
  return Array.from({ length: 7 }, (_, index) => ({
    date: addDays(weekStart, index),
    isCurrentMonth: addDays(weekStart, index).getMonth() === currentDate.getMonth(),
  }));
};

export const buildMonthDays = (currentDate: Date): Array<{ date: Date; isCurrentMonth: boolean }> => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;
  const daysFromNextMonth = totalCells - (daysInMonth + startingDayOfWeek);

  const calendarDays: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  for (let index = startingDayOfWeek - 1; index >= 0; index -= 1) {
    calendarDays.push({
      date: new Date(year, month - 1, prevMonthLastDay - index),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarDays.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  for (let day = 1; day <= daysFromNextMonth; day += 1) {
    calendarDays.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
    });
  }

  return calendarDays;
};

export const getBufferedCalendarRange = (currentDate: Date, viewMode: CalendarViewMode): CalendarRange => {
  if (viewMode === "month") {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const start = startOfDay(addMonths(monthStart, -1));
    const end = endOfDay(addMonths(monthEnd, 1));
    return {
      start,
      end,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }

  const weekDays = buildWeekDays(currentDate);
  const start = startOfDay(addDays(weekDays[0].date, -7));
  const end = endOfDay(addDays(weekDays[weekDays.length - 1].date, 7));
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

export const getVisibleCalendarRange = (currentDate: Date, viewMode: CalendarViewMode): CalendarRange => {
  const days = viewMode === "month" ? buildMonthDays(currentDate) : buildWeekDays(currentDate);
  const start = startOfDay(days[0].date);
  const end = endOfDay(days[days.length - 1].date);
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

export const taskHasDueDateInRange = (
  task: { dueDate?: string | null } | null | undefined,
  range: { start: Date; end: Date }
): boolean => {
  if (!task?.dueDate) return false;
  const dueTime = new Date(task.dueDate).getTime();
  return !Number.isNaN(dueTime) && dueTime >= range.start.getTime() && dueTime <= range.end.getTime();
};
