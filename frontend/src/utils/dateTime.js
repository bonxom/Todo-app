const pad = (value) => String(value).padStart(2, '0');

const toDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateTime = (value, fallback = 'N/A') => {
  const date = toDate(value);

  if (!date) {
    return fallback;
  }

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDateOnly = (value, fallback = 'N/A') => {
  const date = toDate(value);

  if (!date) {
    return fallback;
  }

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const toDateTimeInputValue = (value) => {
  const date = toDate(value);

  if (!date) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const toDateTimeLocalValue = (value) => {
  return toDateTimeInputValue(value);
};

export const toMidnightDateTimeLocalValue = (value = new Date()) => {
  const date = toDate(value);

  if (!date) {
    return '';
  }

  date.setHours(0, 0, 0, 0);
  return toDateTimeLocalValue(date);
};

/**
 * Converts a datetime-local input value (e.g. "2026-06-15T23:59")
 * to a full ISO-8601 string with the local timezone offset.
 * This ensures the backend stores the correct absolute time
 * regardless of server timezone.
 */
export const toISOStringLocal = (datetimeLocalValue) => {
  if (!datetimeLocalValue) {
    return datetimeLocalValue;
  }

  const date = new Date(datetimeLocalValue);

  if (Number.isNaN(date.getTime())) {
    return datetimeLocalValue;
  }

  const tzOffset = -date.getTimezoneOffset();
  const sign = tzOffset >= 0 ? '+' : '-';
  const absOffset = Math.abs(tzOffset);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetMinutes = pad(absOffset % 60);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00${sign}${offsetHours}:${offsetMinutes}`;
};
