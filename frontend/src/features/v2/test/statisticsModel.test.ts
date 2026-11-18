import { describe, expect, it } from "vitest";
import {
  presetRange,
  validateRange,
  completionRate,
  buildTrend,
  buildCategories,
  buildStatuses,
} from "../components/statistics/statisticsModel";
import type { Stat, DailyStat } from "@/shared/types/domain";

describe("statistics model", () => {
  describe("presetRange", () => {
    it("uses inclusive preset boundaries", () => {
      expect(presetRange(7, "2026-11-18")).toEqual({
        start: "2026-11-12",
        end: "2026-11-18",
      });
      expect(presetRange(14, "2026-11-18")).toEqual({
        start: "2026-11-05",
        end: "2026-11-18",
      });
      expect(presetRange(30, "2026-11-18")).toEqual({
        start: "2026-10-20",
        end: "2026-11-18",
      });
      expect(presetRange(90, "2026-11-18")).toEqual({
        start: "2026-08-21",
        end: "2026-11-18",
      });
    });
  });

  describe("validateRange", () => {
    const today = "2026-11-18";

    it("rejects empty or missing dates with required error", () => {
      expect(validateRange({ start: "", end: "2026-11-18" }, today)).toEqual({
        valid: false,
        error: "required",
      });
      expect(validateRange({ start: "2026-11-18", end: "" }, today)).toEqual({
        valid: false,
        error: "required",
      });
    });

    it("rejects impossible dates", () => {
      expect(
        validateRange({ start: "2026-02-30", end: "2026-03-01" }, today),
      ).toEqual({ valid: false, error: "invalid" });
      expect(
        validateRange({ start: "invalid-date", end: "2026-11-18" }, today),
      ).toEqual({ valid: false, error: "invalid" });
      expect(
        validateRange({ start: "2023-02-29", end: "2023-03-01" }, today),
      ).toEqual({ valid: false, error: "invalid" });
    });

    it("accepts leap day on leap years", () => {
      expect(
        validateRange({ start: "2024-02-29", end: "2024-03-01" }, today),
      ).toEqual({
        valid: true,
        range: { start: "2024-02-29", end: "2024-03-01" },
      });
    });

    it("rejects reversed dates", () => {
      expect(
        validateRange({ start: "2026-11-18", end: "2026-11-17" }, today),
      ).toEqual({ valid: false, error: "reversed" });
    });

    it("rejects future-ended ranges", () => {
      expect(
        validateRange({ start: "2026-11-10", end: "2026-11-19" }, today),
      ).toEqual({ valid: false, error: "future" });
    });

    it("accepts a single valid day", () => {
      expect(
        validateRange({ start: "2026-11-18", end: "2026-11-18" }, today),
      ).toEqual({
        valid: true,
        range: { start: "2026-11-18", end: "2026-11-18" },
      });
    });

    it("accepts up to 366 days and rejects 367 days", () => {
      // 2024 is leap year (366 days from 2024-01-01 to 2024-12-31)
      expect(
        validateRange({ start: "2024-01-01", end: "2024-12-31" }, today),
      ).toEqual({
        valid: true,
        range: { start: "2024-01-01", end: "2024-12-31" },
      });

      // 367 days
      expect(
        validateRange({ start: "2023-12-31", end: "2024-12-31" }, today),
      ).toEqual({ valid: false, error: "tooLong" });
    });
  });

  describe("completionRate", () => {
    it("handles zero total tasks", () => {
      expect(
        completionRate({
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          givenUpTasks: 0,
          dailyStats: [],
        }),
      ).toBe(0);
    });

    it("calculates 128 total / 96 completed as 75%", () => {
      expect(
        completionRate({
          totalTasks: 128,
          completedTasks: 96,
          pendingTasks: 10,
          inProgressTasks: 18,
          givenUpTasks: 4,
          dailyStats: [],
        }),
      ).toBe(75);
    });

    it("clamps completion rates between 0 and 100", () => {
      expect(
        completionRate({
          totalTasks: 10,
          completedTasks: 15,
          pendingTasks: 0,
          inProgressTasks: 0,
          givenUpTasks: 0,
          dailyStats: [],
        }),
      ).toBe(100);

      expect(
        completionRate({
          totalTasks: 10,
          completedTasks: -5,
          pendingTasks: 0,
          inProgressTasks: 0,
          givenUpTasks: 0,
          dailyStats: [],
        }),
      ).toBe(0);
    });
  });

  describe("buildTrend", () => {
    const range = { start: "2026-11-15", end: "2026-11-18" };

    it("identifies empty history versus zero activity in range", () => {
      const emptyHistory = buildTrend([], range);
      expect(emptyHistory.hasHistory).toBe(false);
      expect(emptyHistory.dateKeys).toHaveLength(4);
      expect(emptyHistory.completed).toEqual([0, 0, 0, 0]);
      expect(emptyHistory.givenUp).toEqual([0, 0, 0, 0]);
      expect(emptyHistory.completedTotal).toBe(0);
      expect(emptyHistory.givenUpTotal).toBe(0);

      const pastHistory: DailyStat[] = [
        {
          date: "2026-10-01",
          completedTasks: 5,
          givenUpTasks: 1,
          completedOfEachCategory: [],
          givenUpOfEachCategory: [],
        },
      ];
      const zeroInRange = buildTrend(pastHistory, range);
      expect(zeroInRange.hasHistory).toBe(true);
      expect(zeroInRange.completedTotal).toBe(0);
      expect(zeroInRange.givenUpTotal).toBe(0);
    });

    it("fills missing days with zeros and sums duplicate daily keys", () => {
      const dailyStats: DailyStat[] = [
        {
          date: "2026-11-15",
          completedTasks: 3,
          givenUpTasks: 1,
          completedOfEachCategory: [],
          givenUpOfEachCategory: [],
        },
        // duplicate date key
        {
          date: "2026-11-15",
          completedTasks: 2,
          givenUpTasks: 0,
          completedOfEachCategory: [],
          givenUpOfEachCategory: [],
        },
        // 2026-11-16 is missing -> should be 0
        {
          date: "2026-11-17",
          completedTasks: 4,
          givenUpTasks: 2,
          completedOfEachCategory: [],
          givenUpOfEachCategory: [],
        },
      ];

      const result = buildTrend(dailyStats, range);
      expect(result.dateKeys).toEqual([
        "2026-11-15",
        "2026-11-16",
        "2026-11-17",
        "2026-11-18",
      ]);
      expect(result.completed).toEqual([5, 0, 4, 0]);
      expect(result.givenUp).toEqual([1, 0, 2, 0]);
      expect(result.completedTotal).toBe(9);
      expect(result.givenUpTotal).toBe(3);
      expect(result.hasHistory).toBe(true);
    });
  });

  describe("buildCategories", () => {
    it("handles empty daily stats", () => {
      expect(buildCategories([])).toEqual([]);
    });

    it("aggregates categories, calculates percentages, sorts by count descending, then name ascending", () => {
      const dailyStats: DailyStat[] = [
        {
          date: "2026-11-15",
          completedTasks: 5,
          givenUpTasks: 0,
          completedOfEachCategory: [
            { categoryId: "c1", categoryName: "Work", count: 3 },
            { categoryId: "c2", categoryName: "Personal", count: 2 },
          ],
          givenUpOfEachCategory: [],
        },
        {
          date: "2026-11-16",
          completedTasks: 5,
          givenUpTasks: 0,
          completedOfEachCategory: [
            // Repeated category name
            { categoryId: "c1", categoryName: "Work", count: 2 },
            // Same count as personal (total 2) -> alpha tie break: "Art" before "Personal"
            { categoryId: "c3", categoryName: "Art", count: 2 },
            // Zero count category should be omitted
            { categoryId: "c4", categoryName: "Health", count: 0 },
          ],
          givenUpOfEachCategory: [],
        },
      ];

      const items = buildCategories(dailyStats);
      // Total count: Work: 5, Art: 2, Personal: 2 (Sum = 9)
      // Work: 5/9 = 56%, Art: 2/9 = 22%, Personal: 2/9 = 22%
      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({
        key: "Work",
        label: "Work",
        value: 5,
        percentage: (5 / 9) * 100,
      });
      expect(items[1]).toEqual({
        key: "Art",
        label: "Art",
        value: 2,
        percentage: (2 / 9) * 100,
      });
      expect(items[2]).toEqual({
        key: "Personal",
        label: "Personal",
        value: 2,
        percentage: (2 / 9) * 100,
      });
    });
  });

  describe("buildStatuses", () => {
    it("builds status distribution with stable keys and percentages", () => {
      const stats: Stat = {
        totalTasks: 100,
        completedTasks: 60,
        inProgressTasks: 20,
        pendingTasks: 15,
        givenUpTasks: 5,
        dailyStats: [],
      };

      const statuses = buildStatuses(stats);
      expect(statuses).toEqual([
        { key: "pending", label: "pending", value: 15, percentage: 15 },
        { key: "in-progress", label: "in-progress", value: 20, percentage: 20 },
        { key: "completed", label: "completed", value: 60, percentage: 60 },
        { key: "given-up", label: "given-up", value: 5, percentage: 5 },
      ]);
    });

    it("handles zero total statuses", () => {
      const stats: Stat = {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        givenUpTasks: 0,
        dailyStats: [],
      };

      const statuses = buildStatuses(stats);
      expect(statuses).toEqual([
        { key: "pending", label: "pending", value: 0, percentage: 0 },
        { key: "in-progress", label: "in-progress", value: 0, percentage: 0 },
        { key: "completed", label: "completed", value: 0, percentage: 0 },
        { key: "given-up", label: "given-up", value: 0, percentage: 0 },
      ]);
    });
  });
});

describe("unrounded chart proportions", () => {
  it("preserves positive slices smaller than half a percent", () => {
    const items = buildCategories([
      {
        date: "2026-11-18",
        completedTasks: 1000,
        givenUpTasks: 0,
        completedOfEachCategory: [
          { categoryId: "large", categoryName: "Large", count: 999 },
          { categoryId: "small", categoryName: "Small", count: 1 },
        ],
        givenUpOfEachCategory: [],
      },
    ]);
    expect(items.find((item) => item.key === "Small")?.percentage).toBeCloseTo(
      0.1,
    );
    expect(items.reduce((sum, item) => sum + item.percentage, 0)).toBeCloseTo(
      100,
    );
  });
});
