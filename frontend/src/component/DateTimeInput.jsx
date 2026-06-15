import { useState, useEffect, useRef } from 'react';

const pad = (v) => String(v).padStart(2, '0');

/**
 * Converts a datetime-local value (YYYY-MM-DDTHH:mm) to dd/mm/YYYY HH:mm display string.
 */
const toDisplayValue = (datetimeLocalValue) => {
  if (!datetimeLocalValue) return '';

  const date = new Date(datetimeLocalValue);
  if (Number.isNaN(date.getTime())) return datetimeLocalValue;

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * Parses a dd/mm/YYYY HH:mm string to a datetime-local value (YYYY-MM-DDTHH:mm).
 * Returns null if parsing fails.
 */
const parseDisplayValue = (displayStr) => {
  if (!displayStr) return null;

  const match = displayStr.trim().match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\s+(\d{1,2}):(\d{2})$/
  );

  if (!match) return null;

  const [, dayStr, monthStr, yearStr, hourStr, minuteStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }

  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
};

/**
 * A custom date-time input that displays and accepts dd/mm/YYYY HH:mm format.
 *
 * Props:
 * - value: datetime-local string (YYYY-MM-DDTHH:mm)
 * - onChange: called with datetime-local string when valid input is provided
 * - All other props are forwarded to the underlying <input>.
 */
const DateTimeInput = ({ value, onChange, className = '', ...rest }) => {
  const [displayText, setDisplayText] = useState(() => toDisplayValue(value));
  const [hasError, setHasError] = useState(false);
  const lastExternalValue = useRef(value);

  // Sync display text when the external value changes (not from user typing)
  useEffect(() => {
    if (value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      setDisplayText(toDisplayValue(value));
      setHasError(false);
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setDisplayText(raw);

    const parsed = parseDisplayValue(raw);
    if (parsed) {
      setHasError(false);
      lastExternalValue.current = parsed;
      onChange?.(parsed);
    } else if (raw === '') {
      setHasError(false);
      lastExternalValue.current = '';
      onChange?.('');
    } else {
      setHasError(true);
    }
  };

  const handleBlur = () => {
    // On blur, if invalid, revert to last valid value
    if (hasError) {
      setDisplayText(toDisplayValue(value));
      setHasError(false);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayText}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="dd/mm/YYYY HH:mm"
      className={`${className}${hasError ? ' ring-2 ring-[var(--color-danger)] ring-offset-1' : ''}`}
      {...rest}
    />
  );
};

export default DateTimeInput;
