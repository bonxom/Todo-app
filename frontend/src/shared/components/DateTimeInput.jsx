import { useState } from 'react';

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
  const [draftText, setDraftText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const externalDisplayText = toDisplayValue(value);
  const displayText = isEditing ? draftText : externalDisplayText;

  const handleChange = (e) => {
    const raw = e.target.value;
    setDraftText(raw);

    const parsed = parseDisplayValue(raw);
    if (parsed) {
      setHasError(false);
      onChange?.(parsed);
    } else if (raw === '') {
      setHasError(false);
      onChange?.('');
    } else {
      setHasError(true);
    }
  };

  const handleFocus = () => {
    setDraftText(displayText);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setDraftText('');
    setHasError(false);
    setIsEditing(false);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayText}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="dd/mm/YYYY HH:mm"
      className={`${className}${hasError ? ' ring-2 ring-[var(--color-danger)] ring-offset-1' : ''}`}
      {...rest}
    />
  );
};

export default DateTimeInput;
