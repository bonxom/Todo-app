import { useTranslation } from "react-i18next";
import { useState } from "react";

const pad = (v) => String(v).padStart(2, "0");

/**
 * Converts a datetime-local value to the active language’s date order.
 */
const toDisplayValue = (datetimeLocalValue, language) => {
  if (!datetimeLocalValue) return "";

  const date = new Date(datetimeLocalValue);
  if (Number.isNaN(date.getTime())) return datetimeLocalValue;

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const datePart = language === "vi" ? `${day}/${month}` : `${month}/${day}`;
  return `${datePart}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * Parses a localized date and 24-hour time string to a datetime-local value (YYYY-MM-DDTHH:mm).
 * Returns null if parsing fails.
 */
const parseDisplayValue = (displayStr, language) => {
  if (!displayStr) return null;

  const match = displayStr
    .trim()
    .match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\s+(\d{1,2}):(\d{2})$/);

  if (!match) return null;

  const [, first, second, yearStr, hourStr, minuteStr] = match;
  const [dayStr, monthStr] =
    language === "vi" ? [first, second] : [second, first];
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }

  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
};

/**
 * A date-time input with locale date order and a stable format while editing.
 *
 * Props:
 * - value: datetime-local string (YYYY-MM-DDTHH:mm)
 * - onChange: called with datetime-local string when valid input is provided
 * - All other props are forwarded to the underlying <input>.
 */
const DateTimeInput = ({ value, onChange, className = "", ...rest }) => {
  const { i18n } = useTranslation("common");
  const language = i18n.resolvedLanguage;
  const [editingLanguage, setEditingLanguage] = useState(language);
  const [draftText, setDraftText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const externalDisplayText = toDisplayValue(value, language);
  const displayText = isEditing ? draftText : externalDisplayText;

  const handleChange = (e) => {
    const raw = e.target.value;
    setDraftText(raw);

    const parsed = parseDisplayValue(
      raw,
      isEditing ? editingLanguage : language,
    );
    if (parsed) {
      setHasError(false);
      onChange?.(parsed);
    } else if (raw === "") {
      setHasError(false);
      onChange?.("");
    } else {
      setHasError(true);
    }
  };

  const handleFocus = () => {
    setEditingLanguage(language);
    setDraftText(displayText);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setDraftText("");
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
      placeholder={
        (isEditing ? editingLanguage : language) === "vi"
          ? "dd/mm/YYYY HH:mm"
          : "mm/dd/YYYY HH:mm"
      }
      className={`${className}${hasError ? " ring-2 ring-[var(--color-danger)] ring-offset-1" : ""}`}
      {...rest}
    />
  );
};

export default DateTimeInput;
