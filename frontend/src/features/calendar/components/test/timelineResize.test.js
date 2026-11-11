import { describe, it, expect } from "vitest";
import { getResizeRange, getResizeCandidate } from "../timelineResize";
const task = {
  startDate: "2026-11-11T09:00:00",
  dueDate: "2026-11-11T11:00:00",
};
describe("timeline resize", () => {
  it.each([15, 30, 60])("snaps the changed endpoint to %i minutes", (step) => {
    const result = getResizeRange(task, "end", 740, step);
    expect(result.endMinute).toBe(Math.round(740 / step) * step);
    expect(result.field).toBe("dueDate");
    expect(result.startMinute).toBe(540);
  });
  it("writes only a real start when the top edge moves", () => {
    expect(getResizeRange(task, "start", 570, 30)).toMatchObject({
      field: "startDate",
      startMinute: 570,
      endMinute: 660,
    });
    const missing = { dueDate: task.dueDate };
    expect(getResizeRange(missing, "end", 720, 30)).toMatchObject({
      field: "dueDate",
      startMinute: 1,
    });
    expect(getResizeRange(missing, "start", 480, 30)).toMatchObject({
      field: "startDate",
      startMinute: 480,
    });
  });
  it("clamps to the local day and never crosses the opposite endpoint", () => {
    expect(getResizeRange(task, "start", 900, 30).startMinute).toBe(630);
    expect(getResizeRange(task, "end", 300, 30).endMinute).toBe(570);
    expect(getResizeRange(task, "start", -90, 30).startMinute).toBe(0);
    expect(getResizeRange(task, "end", 1500, 30).endMinute).toBe(1439);
    expect(
      getResizeRange(
        { ...task, startDate: "2026-11-10T20:00:00" },
        "start",
        30,
        30,
      ).startMinute,
    ).toBe(30);
  });
  it("ignores unchanged or invalid requests and accounts for scroll movement", () => {
    expect(getResizeRange(task, "start", 540, 30)).toBeNull();
    expect(getResizeRange({ dueDate: "bad" }, "end", 720, 30)).toBeNull();
    expect(getResizeCandidate(540, 36, 1.2, 72)).toBe(630);
  });
});
