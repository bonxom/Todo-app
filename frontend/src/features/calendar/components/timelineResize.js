const minuteOfDay = (date) => date.getHours() * 60 + date.getMinutes();
export const getResizeCandidate = (
  originMinute,
  deltaY,
  pixelsPerMinute,
  scrollDelta = 0,
) => originMinute + (deltaY + scrollDelta) / pixelsPerMinute;

export function getResizeRange(task, edge, candidateMinute, interval) {
  const end = new Date(task.dueDate);
  if (
    !task.dueDate ||
    !Number.isFinite(end.getTime()) ||
    !Number.isFinite(candidateMinute) ||
    ![15, 30, 60].includes(interval) ||
    !["start", "end"].includes(edge)
  )
    return null;
  const day = new Date(end);
  day.setHours(0, 0, 0, 0);
  const parsedStart = task.startDate ? new Date(task.startDate) : null;
  const start =
    parsedStart && Number.isFinite(parsedStart.getTime())
      ? parsedStart
      : new Date(day.getTime() + 60000);
  const startMinute = start < day ? 0 : minuteOfDay(start);
  const endMinute = minuteOfDay(end);
  const snapped = Math.round(candidateMinute / interval) * interval;
  // Only the moved endpoint is changed. The other endpoint retains its exact timestamp.
  const min =
    edge === "start"
      ? 0
      : start < day
        ? 0
        : (Math.floor(startMinute / interval) + 1) * interval;
  const max =
    edge === "end" ? 1439 : (Math.ceil(endMinute / interval) - 1) * interval;
  if (
    min > max ||
    (edge === "end" &&
      start >= new Date(new Date(day).setDate(day.getDate() + 1)))
  )
    return null;
  const minute = Math.max(min, Math.min(max, snapped));
  const next = new Date(day);
  next.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  if (edge === "start" ? next >= end : next <= start) return null;
  const original = edge === "start" ? start : end;
  if (next.getTime() === original.getTime()) return null;
  return {
    field: edge === "start" ? "startDate" : "dueDate",
    value: next.toISOString(),
    startMinute: edge === "start" ? minute : startMinute,
    endMinute: edge === "end" ? minute : endMinute,
  };
}
