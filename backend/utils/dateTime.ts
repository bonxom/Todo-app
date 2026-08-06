export interface DateUpdateResult {
  shouldUpdate: boolean;
  value?: Date | null;
  error?: string;
}

const DATE_ONLY_PATTERN = /^(\d{4})[-/](\d{2})[-/](\d{2})$/;
const DATE_TIME_LOCAL_BARE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:\d{2})?$/;
const DATE_TIME_WITH_TZ_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
const DISPLAY_DATE_TIME_PATTERN = /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/;

export const getStartOfToday = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

export const normalizeTaskDateInput = (value: unknown): DateUpdateResult => {
  if (value === undefined) {
    return { shouldUpdate: false };
  }

  if (value === null || value === '') {
    return { shouldUpdate: true, value: null };
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? { shouldUpdate: false, error: 'Invalid date value' }
      : { shouldUpdate: true, value };
  }

  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(DATE_ONLY_PATTERN);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return {
        shouldUpdate: true,
        value: new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0),
      };
    }

    const dateTimeWithTzMatch = value.match(DATE_TIME_WITH_TZ_PATTERN);
    if (dateTimeWithTzMatch) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime())
        ? { shouldUpdate: false, error: 'Invalid date value' }
        : { shouldUpdate: true, value: parsed };
    }

    const dateTimeLocalMatch = value.match(DATE_TIME_LOCAL_BARE_PATTERN);
    if (dateTimeLocalMatch) {
      const [, year, month, day, hour, minute] = dateTimeLocalMatch;
      return {
        shouldUpdate: true,
        value: new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0),
      };
    }

    const displayDateTimeMatch = value.match(DISPLAY_DATE_TIME_PATTERN);
    if (displayDateTimeMatch) {
      const [, year, month, day, hour, minute] = displayDateTimeMatch;
      return {
        shouldUpdate: true,
        value: new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0),
      };
    }
  }

  const parsedDate = new Date(value as string | number | Date);
  if (Number.isNaN(parsedDate.getTime())) {
    return { shouldUpdate: false, error: 'Invalid date value' };
  }

  return { shouldUpdate: true, value: parsedDate };
};
