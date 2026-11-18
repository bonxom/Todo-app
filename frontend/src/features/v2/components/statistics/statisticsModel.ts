import type { Stat, DailyStat } from "@/shared/types/domain";
import {
  getDateKeysInRange,
  normalizeDailyStats,
  parseUtcDateKey,
  shiftUtcDateKey,
} from "@/features/statistics/components/statsUtils";

export type DateRange = { start: string; end: string };

export type RangeError =
  "required" | "invalid" | "reversed" | "future" | "tooLong";

export type RangeValidation =
  { valid: true; range: DateRange } | { valid: false; error: RangeError };

export type BreakdownItem = {
  key: string;
  label: string;
  value: number;
  percentage: number;
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function presetRange(days: 7 | 14 | 30 | 90, today: string): DateRange {
  return {
    start: shiftUtcDateKey(today, -(days - 1)) || today,
    end: today,
  };
}

export function validateRange(
  range: DateRange,
  today: string,
): RangeValidation {
  if (!range || !range.start?.trim() || !range.end?.trim()) {
    return { valid: false, error: "required" };
  }

  const start = range.start.trim();
  const end = range.end.trim();

  if (!isValidIsoDate(start) || !isValidIsoDate(end)) {
    return { valid: false, error: "invalid" };
  }

  if (start > end) {
    return { valid: false, error: "reversed" };
  }

  if (end > today) {
    return { valid: false, error: "future" };
  }

  const startDate = parseUtcDateKey(start);
  const endDate = parseUtcDateKey(end);

  if (!startDate || !endDate) {
    return { valid: false, error: "invalid" };
  }

  const diffDays =
    Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

  if (diffDays > 366) {
    return { valid: false, error: "tooLong" };
  }

  return { valid: true, range: { start, end } };
}

export function completionRate(stats: Stat): number {
  if (!stats || !stats.totalTasks || stats.totalTasks <= 0) {
    return 0;
  }
  const rate = Math.round((stats.completedTasks / stats.totalTasks) * 100);
  return Math.max(0, Math.min(100, rate));
}

export function buildTrend(
  dailyStats: DailyStat[],
  range: DateRange,
): {
  dateKeys: string[];
  completed: number[];
  givenUp: number[];
  completedTotal: number;
  givenUpTotal: number;
  hasHistory: boolean;
} {
  const hasHistory = Array.isArray(dailyStats) && dailyStats.length > 0;
  const normalized = normalizeDailyStats(dailyStats || []);
  const completedMap = new Map<string, number>();
  const givenUpMap = new Map<string, number>();

  normalized.forEach(
    (item: {
      dateKey: string;
      completedTasks: number;
      givenUpTasks: number;
    }) => {
      completedMap.set(
        item.dateKey,
        (completedMap.get(item.dateKey) || 0) + item.completedTasks,
      );
      givenUpMap.set(
        item.dateKey,
        (givenUpMap.get(item.dateKey) || 0) + item.givenUpTasks,
      );
    },
  );

  const dateKeys = getDateKeysInRange(range.start, range.end);
  const completed = dateKeys.map((key) => completedMap.get(key) || 0);
  const givenUp = dateKeys.map((key) => givenUpMap.get(key) || 0);
  const completedTotal = completed.reduce((sum, val) => sum + val, 0);
  const givenUpTotal = givenUp.reduce((sum, val) => sum + val, 0);

  return {
    dateKeys,
    completed,
    givenUp,
    completedTotal,
    givenUpTotal,
    hasHistory,
  };
}

export function buildCategories(dailyStats: DailyStat[]): BreakdownItem[] {
  const categoryMap = new Map<string, number>();

  (dailyStats || []).forEach((day) => {
    (day.completedOfEachCategory || []).forEach((cat) => {
      const name = cat.categoryName?.trim();
      if (name && cat.count > 0) {
        categoryMap.set(name, (categoryMap.get(name) || 0) + cat.count);
      }
    });
  });

  const total = Array.from(categoryMap.values()).reduce(
    (sum, val) => sum + val,
    0,
  );
  const items: BreakdownItem[] = [];

  categoryMap.forEach((count, name) => {
    items.push({
      key: name,
      label: name,
      value: count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    });
  });

  items.sort((a, b) => {
    if (b.value !== a.value) {
      return b.value - a.value;
    }
    return a.label.localeCompare(b.label);
  });

  return items;
}

export function buildStatuses(stats: Stat): BreakdownItem[] {
  const pending = stats?.pendingTasks || 0;
  const inProgress = stats?.inProgressTasks || 0;
  const completed = stats?.completedTasks || 0;
  const givenUp = stats?.givenUpTasks || 0;
  const total = pending + inProgress + completed + givenUp;

  const getPercent = (val: number) => (total > 0 ? (val / total) * 100 : 0);

  return [
    {
      key: "pending",
      label: "pending",
      value: pending,
      percentage: getPercent(pending),
    },
    {
      key: "in-progress",
      label: "in-progress",
      value: inProgress,
      percentage: getPercent(inProgress),
    },
    {
      key: "completed",
      label: "completed",
      value: completed,
      percentage: getPercent(completed),
    },
    {
      key: "given-up",
      label: "given-up",
      value: givenUp,
      percentage: getPercent(givenUp),
    },
  ];
}
