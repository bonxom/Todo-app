import { describe, expect, it } from "vitest";
import {
  buildMonthDays,
  buildWeekDays,
  getStartOfWeek,
} from "../calendarRanges";

describe("calendarRanges weekStartsOn support", () => {
  // 2026-11-20 is a Friday (day = 5)
  const sampleDate = new Date(2026, 10, 20);

  it("starts weeks on Sunday by default", () => {
    const start = getStartOfWeek(sampleDate);
    expect(start.getDay()).toBe(0);
    expect(start.getDate()).toBe(15);

    const days = buildWeekDays(sampleDate);
    expect(days).toHaveLength(7);
    expect(days[0].date.getDay()).toBe(0);
    expect(days[6].date.getDay()).toBe(6);
  });

  it("starts weeks on Monday when weekStartsOn is monday", () => {
    const start = getStartOfWeek(sampleDate, "monday");
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(16);

    const days = buildWeekDays(sampleDate, "monday");
    expect(days).toHaveLength(7);
    expect(days[0].date.getDay()).toBe(1);
    expect(days[6].date.getDay()).toBe(0);

    // Sunday itself (2026-11-22) should belong to the Monday 2026-11-16 week
    const sunday = new Date(2026, 10, 22);
    const sundayWeekStart = getStartOfWeek(sunday, "monday");
    expect(sundayWeekStart.getDay()).toBe(1);
    expect(sundayWeekStart.getDate()).toBe(16);
  });

  it("builds month grid aligned to Monday when weekStartsOn is monday", () => {
    // November 2026 starts on Sunday (Nov 1, 2026)
    const sundayGrid = buildMonthDays(sampleDate, "sunday");
    expect(sundayGrid[0].date.getDay()).toBe(0);
    expect(sundayGrid[0].date.getDate()).toBe(1);
    expect(sundayGrid[0].isCurrentMonth).toBe(true);

    const mondayGrid = buildMonthDays(sampleDate, "monday");
    expect(mondayGrid[0].date.getDay()).toBe(1);
    // Oct 26, 2026 is the Monday before Sunday Nov 1, 2026
    expect(mondayGrid[0].date.getMonth()).toBe(9);
    expect(mondayGrid[0].date.getDate()).toBe(26);
    expect(mondayGrid[0].isCurrentMonth).toBe(false);
    expect(mondayGrid[6].date.getMonth()).toBe(10);
    expect(mondayGrid[6].date.getDate()).toBe(1);
    expect(mondayGrid[6].isCurrentMonth).toBe(true);
  });
});
