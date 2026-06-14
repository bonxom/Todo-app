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

  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDateOnly = (value, fallback = 'N/A') => {
  const date = toDate(value);

  if (!date) {
    return fallback;
  }

  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
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
