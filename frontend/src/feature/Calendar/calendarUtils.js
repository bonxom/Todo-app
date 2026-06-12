export const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const addDays = (value, amount) => {
  const date = startOfDay(value);
  date.setDate(date.getDate() + amount);
  return date;
};

export const getDateKey = (value) => {
  const date = startOfDay(value);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const isSameDay = (left, right) => {
  if (!left || !right) return false;
  return startOfDay(left).getTime() === startOfDay(right).getTime();
};

export const getStartOfWeek = (value) => {
  const date = startOfDay(value);
  date.setDate(date.getDate() - date.getDay());
  return date;
};

export const buildMonthDays = (currentDate) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;
  const daysFromNextMonth = totalCells - (daysInMonth + startingDayOfWeek);

  const calendarDays = [];

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

export const buildWeekDays = (currentDate) => {
  const weekStart = getStartOfWeek(currentDate);

  return Array.from({ length: 7 }, (_, index) => ({
    date: addDays(weekStart, index),
    isCurrentMonth: addDays(weekStart, index).getMonth() === currentDate.getMonth(),
  }));
};

export const groupTasksByDate = (tasks) => {
  const grouped = {};

  tasks.forEach((task) => {
    if (!task.dueDate) return;

    const dateKey = getDateKey(task.dueDate);
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(task);
  });

  return grouped;
};

export const formatMonthLabel = (currentDate) => currentDate.toLocaleDateString('en-US', {
  month: 'long',
  year: 'numeric',
});

export const formatWeekLabel = (currentDate) => {
  const weekStart = getStartOfWeek(currentDate);
  const weekEnd = addDays(weekStart, 6);
  const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = weekEnd.toLocaleDateString('en-US', {
    month: weekStart.getMonth() === weekEnd.getMonth() ? undefined : 'short',
    day: 'numeric',
    year: weekStart.getFullYear() === weekEnd.getFullYear() ? undefined : 'numeric',
  });
  const yearLabel = weekStart.getFullYear() === weekEnd.getFullYear()
    ? weekEnd.getFullYear()
    : `${weekStart.getFullYear()} / ${weekEnd.getFullYear()}`;

  return `${startLabel} - ${endLabel}, ${yearLabel}`;
};
