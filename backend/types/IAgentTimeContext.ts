export type AgentTimeContext = {
  now: string; // ISO instant UTC, millisecond precision
  timeZone: string; // validated, canonical IANA name or UTC
  source: "client" | "fallback";
  localDate: string; // YYYY-MM-DD
  localDateTime: string; // ISO local datetime with numeric UTC offset
  weekStartsOn: "monday";
  ranges: Record<
    "yesterday" | "today" | "tomorrow" | "thisWeek" | "nextWeek",
    { startDate: string; endDate: string }
  >;
};
