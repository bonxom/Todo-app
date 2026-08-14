const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}/;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (value) => String(value).padStart(2, '0');

export const toUtcDateKey = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const match = value.match(DATE_KEY_PATTERN);
    if (match) {
      return match[0];
    }
  }

  const parsedDate = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return `${parsedDate.getUTCFullYear()}-${pad(parsedDate.getUTCMonth() + 1)}-${pad(parsedDate.getUTCDate())}`;
};

export const parseUtcDateKey = (dateKey) => {
  if (!dateKey) {
    return null;
  }

  return new Date(`${dateKey}T00:00:00.000Z`);
};

const parseLocalDateKey = (dateKey) => {
  if (!DATE_KEY_PATTERN.test(dateKey || '')) {
    return null;
  }

  const [year, month, day] = dateKey.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const shiftUtcDateKey = (dateKey, amount) => {
  const parsedDate = parseUtcDateKey(dateKey);

  if (!parsedDate) {
    return null;
  }

  parsedDate.setUTCDate(parsedDate.getUTCDate() + amount);
  return toUtcDateKey(parsedDate);
};

export const getUtcTodayKey = () => toUtcDateKey(new Date());

const toLocalDateKey = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const match = value.match(DATE_KEY_PATTERN);
    if (match) {
      return match[0];
    }
  }

  const parsedDate = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return `${parsedDate.getFullYear()}-${pad(parsedDate.getMonth() + 1)}-${pad(parsedDate.getDate())}`;
};

const shiftLocalDateKey = (dateKey, amount) => {
  const parsedDate = parseLocalDateKey(dateKey);

  if (!parsedDate) {
    return null;
  }

  parsedDate.setDate(parsedDate.getDate() + amount);
  return toLocalDateKey(parsedDate);
};

const getLocalTodayKey = () => toLocalDateKey(new Date());

const getLocalDateKeysInRange = (startKey, endKey) => {
  if (!startKey || !endKey || startKey > endKey) {
    return [];
  }

  const keys = [];
  let cursorKey = startKey;

  while (cursorKey && cursorKey <= endKey) {
    keys.push(cursorKey);
    cursorKey = shiftLocalDateKey(cursorKey, 1);
  }

  return keys;
};

export const getDateKeysInRange = (startKey, endKey) => {
  if (!startKey || !endKey || startKey > endKey) {
    return [];
  }

  const keys = [];
  let cursorKey = startKey;

  while (cursorKey && cursorKey <= endKey) {
    keys.push(cursorKey);
    cursorKey = shiftUtcDateKey(cursorKey, 1);
  }

  return keys;
};

export const normalizeDailyStats = (dailyStats = []) => {
  return dailyStats
    .map((stat) => {
      const dateKey = toUtcDateKey(stat?.date);

      if (!dateKey) {
        return null;
      }

      return {
        ...stat,
        dateKey,
        completedTasks: Number(stat?.completedTasks) || 0,
        givenUpTasks: Number(stat?.givenUpTasks) || 0,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
};

export const formatUtcDateLabel = (dateKey, options) => {
  const parsedDate = parseUtcDateKey(dateKey);

  if (!parsedDate) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    timeZone: 'UTC',
    ...options,
  }).format(parsedDate);
};

export const formatDateKeyLabel = (dateKey) => {
  if (!DATE_KEY_PATTERN.test(dateKey || '')) {
    return '';
  }

  return dateKey.slice(0, 10);
};

export const formatDateKeyMonthLabel = (dateKey) => {
  if (!DATE_KEY_PATTERN.test(dateKey || '')) {
    return '';
  }

  const monthIndex = Number(dateKey.slice(5, 7)) - 1;
  return MONTH_LABELS[monthIndex] || '';
};

export const formatUtcDateTimeLabel = (dateKey) => {
  const parsedDate = parseUtcDateKey(dateKey);

  if (!parsedDate) {
    return '';
  }

  return `${parsedDate.getUTCFullYear()}/${pad(parsedDate.getUTCMonth() + 1)}/${pad(parsedDate.getUTCDate())} 00:00`;
};

const getHeatLevel = (count, maxCount) => {
  if (count <= 0 || maxCount <= 0) {
    return 0;
  }

  if (maxCount === 1) {
    return 4;
  }

  const ratio = count / maxCount;

  if (ratio >= 0.75) {
    return 4;
  }

  if (ratio >= 0.5) {
    return 3;
  }

  if (ratio >= 0.25) {
    return 2;
  }

  return 1;
};

export const createHeatmapModel = (dailyStats = [], totalDays = 365) => {
  const normalizedDailyStats = normalizeDailyStats(dailyStats);
  const completionMap = new Map();

  normalizedDailyStats.forEach((stat) => {
    completionMap.set(stat.dateKey, (completionMap.get(stat.dateKey) || 0) + stat.completedTasks);
  });

  const rangeEndKey = getLocalTodayKey();
  const rangeStartKey = shiftLocalDateKey(rangeEndKey, -(totalDays - 1));
  const inRangeDateKeys = getLocalDateKeysInRange(rangeStartKey, rangeEndKey);
  const rangeStartDate = parseLocalDateKey(rangeStartKey);
  const gridStartDate = new Date(rangeStartDate);
  gridStartDate.setDate(gridStartDate.getDate() - gridStartDate.getDay());

  const rangeEndDate = parseLocalDateKey(rangeEndKey);
  const gridEndDate = new Date(rangeEndDate);
  gridEndDate.setDate(gridEndDate.getDate() + (6 - gridEndDate.getDay()));

  const inRangeSet = new Set(inRangeDateKeys);
  const maxCount = inRangeDateKeys.reduce((highest, dateKey) => {
    return Math.max(highest, completionMap.get(dateKey) || 0);
  }, 0);

  const cells = [];
  const cursor = new Date(gridStartDate);

  while (cursor <= gridEndDate) {
    const dateKey = toLocalDateKey(cursor);
    const count = completionMap.get(dateKey) || 0;

    cells.push({
      dateKey,
      count,
      level: getHeatLevel(count, maxCount),
      isInRange: inRangeSet.has(dateKey),
      weekdayIndex: cursor.getDay(),
      dayOfMonth: cursor.getDate(),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  const monthLabels = [];
  let lastMonthKey = null;

  weeks.forEach((week, columnIndex) => {
    const firstMonthCell = week.find((cell) => cell.isInRange && cell.dayOfMonth <= 7);

    if (!firstMonthCell) {
      return;
    }

    const monthKey = firstMonthCell.dateKey.slice(0, 7);

    if (monthKey === lastMonthKey) {
      return;
    }

    monthLabels.push({
      columnIndex,
      label: formatDateKeyMonthLabel(firstMonthCell.dateKey),
    });

    lastMonthKey = monthKey;
  });

  const activeDays = inRangeDateKeys.reduce((count, dateKey) => {
    return count + ((completionMap.get(dateKey) || 0) > 0 ? 1 : 0);
  }, 0);

  const totalCompleted = inRangeDateKeys.reduce((count, dateKey) => {
    return count + (completionMap.get(dateKey) || 0);
  }, 0);

  const bestDay = inRangeDateKeys.reduce((best, dateKey) => {
    const count = completionMap.get(dateKey) || 0;

    if (!best || count > best.count || (count === best.count && dateKey > best.dateKey)) {
      return { dateKey, count };
    }

    return best;
  }, null);

  return {
    weeks,
    monthLabels,
    activeDays,
    totalCompleted,
    bestDay,
    rangeStartKey,
    rangeEndKey,
    maxCount,
  };
};
