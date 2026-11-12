import { describe, expect, it } from "vitest";
import { layoutDayTasks } from "../timelineLayout";

const day = new Date(2026, 10, 11);
const task = (id, start, end) => ({
  _id: id,
  startDate: start && `2026-11-11T${start}:00`,
  dueDate: `2026-11-11T${end}:00`,
});

describe("timeline layout", () => {
  it("treats a start on a later date as a deadline marker even if its clock time is earlier", () => {
    const [row] = layoutDayTasks(
      [{ ...task("future", null, "17:00"), startDate: "2026-11-12T09:00:00" }],
      day,
      1,
    );
    expect(row).toMatchObject({
      isReversedOrZero: true,
      top: 1020,
      height: 28,
    });
  });
  it("positions a real interval and uses a display-only 00:01 fallback", () => {
    const source = task("a", null, "17:30");
    const [result] = layoutDayTasks([source], day, 1);
    expect(result).toMatchObject({
      startMinute: 1,
      endMinute: 1050,
      top: 1,
      height: 1049,
    });
    expect(source.startDate).toBeNull();
    expect(
      layoutDayTasks([task("b", "09:00", "10:30")], day, 2)[0],
    ).toMatchObject({ top: 1080, height: 180 });
  });

  it("allocates overlap chains without overlapping cards and reuses lanes", () => {
    const rows = layoutDayTasks(
      [
        task("a", "09:00", "10:00"),
        task("b", "09:30", "10:30"),
        task("c", "10:00", "11:00"),
        task("d", "12:00", "13:00"),
      ],
      day,
      1,
    );
    expect(rows.map((r) => [r.lane, r.laneCount])).toEqual([
      [0, 2],
      [1, 2],
      [0, 2],
      [0, 1],
    ]);
  });

  it("clips earlier starts and handles midnight, reversed and invalid dates", () => {
    expect(
      layoutDayTasks(
        [{ ...task("a", null, "09:00"), startDate: "2026-11-10T21:00:00" }],
        day,
        1,
      )[0],
    ).toMatchObject({ startMinute: 0, endMinute: 540 });

    for (const item of [
      task("b", null, "00:00"),
      task("c", "19:00", "17:00"),
      task("d", "23:59", "23:59"),
    ]) {
      const [row] = layoutDayTasks([item], day, 1);
      expect(row.height).toBe(28);
      expect(row.top).toBeGreaterThanOrEqual(0);
      expect(row.top + row.height).toBeLessThanOrEqual(1440);
    }
    expect(layoutDayTasks([{ dueDate: "invalid" }, {}], day, 1)).toEqual([]);
  });
});
