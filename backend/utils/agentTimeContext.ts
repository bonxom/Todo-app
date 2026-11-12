import { Temporal } from "@js-temporal/polyfill";
import type { AgentTimeContext } from "../types/IAgentTimeContext.js";

/**
 * Validate and canonicalize an IANA timezone string.
 * Accepts canonical IANA names (e.g. "Asia/Ho_Chi_Minh", "UTC").
 * Rejects pure offsets like "+07:00" and invalid names.
 * @throws {RangeError} if the value is not a valid IANA timezone
 */
export function normalizeTimeZone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 100) {
    throw new RangeError(`Invalid time zone: ${trimmed}`);
  }
  // Reject pure UTC offsets like "+07:00", "-05:00", "+0700"
  if (/^[+-]\d{2}(:\d{2})?$/.test(trimmed)) {
    throw new RangeError(
      `Pure offset time zone not accepted: ${trimmed}. Use an IANA name.`,
    );
  }
  try {
    // Use Intl.DateTimeFormat to validate and canonicalize
    const canonical = new Intl.DateTimeFormat("en-US", {
      timeZone: trimmed,
    }).resolvedOptions().timeZone;
    return canonical;
  } catch {
    throw new RangeError(`Invalid time zone: ${trimmed}`);
  }
}

function rangeFromMidnights(
  startZoned: Temporal.ZonedDateTime,
  nextStartZoned: Temporal.ZonedDateTime,
): { startDate: string; endDate: string } {
  return {
    startDate: new Date(Number(startZoned.epochMilliseconds)).toISOString(),
    endDate: new Date(
      Number(nextStartZoned.epochMilliseconds) - 1,
    ).toISOString(),
  };
}

/**
 * Build a deterministic time context snapshot from a backend instant and
 * optional client timezone. Used once per turn claim.
 */
export function createAgentTimeContext(
  now: Date,
  timeZone?: string,
): AgentTimeContext {
  const source: "client" | "fallback" = timeZone ? "client" : "fallback";
  const zone = timeZone ? normalizeTimeZone(timeZone) : "UTC";

  const instant = Temporal.Instant.from(now.toISOString());
  const zoned = instant.toZonedDateTimeISO(zone);

  // Today
  const todayStart = zoned.startOfDay();
  const tomorrowStart = todayStart.add({ days: 1 }).startOfDay();

  // Yesterday
  const yesterdayStart = todayStart.subtract({ days: 1 }).startOfDay();

  // Tomorrow end
  const dayAfterTomorrowStart = tomorrowStart.add({ days: 1 }).startOfDay();

  // This week (Monday to Sunday)
  const dayOfWeek = todayStart.dayOfWeek; // 1=Monday, 7=Sunday
  const thisWeekStart = todayStart
    .subtract({ days: dayOfWeek - 1 })
    .startOfDay();
  const nextWeekStart = thisWeekStart.add({ weeks: 1 }).startOfDay();
  const weekAfterNextStart = nextWeekStart.add({ weeks: 1 }).startOfDay();

  // localDateTime: ISO local datetime with numeric UTC offset
  // e.g., "2026-11-12T01:30:00+07:00"
  const localDateTime = zoned.toString({
    timeZoneName: "never",
    calendarName: "never",
  });

  return {
    now: now.toISOString(),
    timeZone: zone,
    source,
    localDate: zoned.toPlainDate().toString(),
    localDateTime,
    weekStartsOn: "monday",
    ranges: {
      yesterday: rangeFromMidnights(yesterdayStart, todayStart),
      today: rangeFromMidnights(todayStart, tomorrowStart),
      tomorrow: rangeFromMidnights(tomorrowStart, dayAfterTomorrowStart),
      thisWeek: rangeFromMidnights(thisWeekStart, nextWeekStart),
      nextWeek: rangeFromMidnights(nextWeekStart, weekAfterNextStart),
    },
  };
}
