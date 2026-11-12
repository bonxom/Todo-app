import { describe, it, expect } from "vitest";
import {
  createAgentTimeContext,
  normalizeTimeZone,
} from "../agentTimeContext.js";

// Runtime canonical name depends on ICU data; resolve once for test assertions.
const canonical = (zone: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions()
    .timeZone;
describe("normalizeTimeZone", () => {
  it("accepts and canonicalizes valid IANA zones", () => {
    expect(normalizeTimeZone("Asia/Ho_Chi_Minh")).toBe(
      canonical("Asia/Ho_Chi_Minh"),
    );
    expect(normalizeTimeZone("UTC")).toBe("UTC");
    expect(normalizeTimeZone("America/New_York")).toBe("America/New_York");
    expect(normalizeTimeZone("Europe/London")).toBe("Europe/London");
  });

  it("canonicalizes aliases", () => {
    // US/Eastern is an alias for America/New_York on most runtimes
    expect(normalizeTimeZone("US/Eastern")).toBe(canonical("US/Eastern"));
  });

  it("rejects pure offsets", () => {
    expect(() => normalizeTimeZone("+07:00")).toThrow(RangeError);
    expect(() => normalizeTimeZone("-05:00")).toThrow(RangeError);
    expect(() => normalizeTimeZone("+00:00")).toThrow(RangeError);
  });

  it("rejects invalid names", () => {
    expect(() => normalizeTimeZone("Foo/Bar")).toThrow(RangeError);
    expect(() => normalizeTimeZone("")).toThrow(RangeError);
    expect(() => normalizeTimeZone("   ")).toThrow(RangeError);
  });

  it("rejects values exceeding 100 characters", () => {
    expect(() => normalizeTimeZone("A".repeat(101))).toThrow(RangeError);
  });

  it("trims whitespace", () => {
    expect(normalizeTimeZone("  UTC  ")).toBe("UTC");
  });
});

describe("createAgentTimeContext", () => {
  // Spec example: fixed instant 2026-11-11T18:30:00.000Z, zone Asia/Ho_Chi_Minh
  // Local time: 2026-11-12 01:30:00 +07:00
  it("computes correct ranges for Asia/Ho_Chi_Minh (spec example)", () => {
    const ctx = createAgentTimeContext(
      new Date("2026-11-11T18:30:00.000Z"),
      "Asia/Ho_Chi_Minh",
    );
    const hcmCanonical = canonical("Asia/Ho_Chi_Minh");

    expect(ctx.now).toBe("2026-11-11T18:30:00.000Z");
    expect(ctx.timeZone).toBe(hcmCanonical);
    expect(ctx.source).toBe("client");
    expect(ctx.localDate).toBe("2026-11-12");
    expect(ctx.weekStartsOn).toBe("monday");
    // Today: 2026-11-12 00:00 +07 = 2026-11-11T17:00:00.000Z
    //        to 2026-11-13 00:00 +07 - 1ms = 2026-11-12T16:59:59.999Z
    expect(ctx.ranges.today).toEqual({
      startDate: "2026-11-11T17:00:00.000Z",
      endDate: "2026-11-12T16:59:59.999Z",
    });
  });

  it("handles DST spring forward: America/New_York 2026-03-08 (23h day)", () => {
    // 2026-03-08: DST spring forward in US, day has 23 hours
    const ctx = createAgentTimeContext(
      new Date("2026-03-08T12:00:00Z"),
      "America/New_York",
    );

    const todayStart = Date.parse(ctx.ranges.today.startDate);
    const todayEnd = Date.parse(ctx.ranges.today.endDate);
    // 23 hours = 82800000 ms; endDate is start of next day minus 1ms
    expect(todayEnd + 1 - todayStart).toBe(23 * 60 * 60 * 1000);
  });

  it("handles DST fall back: America/New_York 2026-11-01 (25h day)", () => {
    // 2026-11-01: DST fall back in US, day has 25 hours
    const ctx = createAgentTimeContext(
      new Date("2026-11-01T12:00:00Z"),
      "America/New_York",
    );

    const todayStart = Date.parse(ctx.ranges.today.startDate);
    const todayEnd = Date.parse(ctx.ranges.today.endDate);
    expect(todayEnd + 1 - todayStart).toBe(25 * 60 * 60 * 1000);
  });

  it("handles year boundary: 2026-12-31 → tomorrow 2027-01-01", () => {
    const ctx = createAgentTimeContext(new Date("2026-12-31T12:00:00Z"), "UTC");

    expect(ctx.localDate).toBe("2026-12-31");
    expect(ctx.ranges.tomorrow.startDate).toBe("2027-01-01T00:00:00.000Z");
    expect(ctx.ranges.tomorrow.endDate).toBe("2027-01-01T23:59:59.999Z");
  });

  it("computes thisWeek starting Monday", () => {
    // 2026-11-12 is a Thursday. Monday = 2026-11-09
    const ctx = createAgentTimeContext(
      new Date("2026-11-12T10:00:00.000Z"),
      "UTC",
    );

    expect(ctx.ranges.thisWeek.startDate).toBe("2026-11-09T00:00:00.000Z");
    // Next Monday = 2026-11-16
    expect(ctx.ranges.thisWeek.endDate).toBe("2026-11-15T23:59:59.999Z");
  });

  it("computes thisWeek on Monday", () => {
    // 2026-11-09 is a Monday
    const ctx = createAgentTimeContext(
      new Date("2026-11-09T10:00:00.000Z"),
      "UTC",
    );

    expect(ctx.ranges.thisWeek.startDate).toBe("2026-11-09T00:00:00.000Z");
    expect(ctx.ranges.thisWeek.endDate).toBe("2026-11-15T23:59:59.999Z");
  });

  it("computes thisWeek on Sunday", () => {
    // 2026-11-15 is a Sunday. Monday = 2026-11-09
    const ctx = createAgentTimeContext(
      new Date("2026-11-15T10:00:00.000Z"),
      "UTC",
    );

    expect(ctx.ranges.thisWeek.startDate).toBe("2026-11-09T00:00:00.000Z");
    expect(ctx.ranges.thisWeek.endDate).toBe("2026-11-15T23:59:59.999Z");
  });

  it("computes nextWeek across year boundary", () => {
    // 2026-12-28 is Monday. nextWeek starts 2027-01-04 (Monday)
    const ctx = createAgentTimeContext(new Date("2026-12-28T12:00:00Z"), "UTC");

    expect(ctx.ranges.nextWeek.startDate).toBe("2027-01-04T00:00:00.000Z");
    expect(ctx.ranges.nextWeek.endDate).toBe("2027-01-10T23:59:59.999Z");
  });

  it("falls back to UTC with fallback source when no timezone given", () => {
    const ctx = createAgentTimeContext(new Date("2026-11-11T18:30:00.000Z"));

    expect(ctx.timeZone).toBe("UTC");
    expect(ctx.source).toBe("fallback");
    expect(ctx.localDate).toBe("2026-11-11");
  });

  it("localDateTime includes UTC offset", () => {
    const ctx = createAgentTimeContext(
      new Date("2026-11-11T18:30:00.000Z"),
      "Asia/Ho_Chi_Minh",
    );

    // Should be something like 2026-11-12T01:30:00+07:00
    expect(ctx.localDateTime).toContain("+07:00");
    expect(ctx.localDateTime).toContain("2026-11-12T01:30:00");
  });
});
