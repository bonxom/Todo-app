import { beforeEach, describe, expect, it } from "vitest";
import { filterTasks, useTaskFilterStore } from "../useTaskFilterStore";
import type { Task } from "@/shared/types/domain";

describe("useTaskFilterStore", () => {
  beforeEach(() => {
    useTaskFilterStore.setState({ onlyInProgress: false });
  });

  it("sets onlyInProgress state", () => {
    expect(useTaskFilterStore.getState().onlyInProgress).toBe(false);
    useTaskFilterStore.getState().setOnlyInProgress(true);
    expect(useTaskFilterStore.getState().onlyInProgress).toBe(true);
  });

  it("toggles onlyInProgress state", () => {
    expect(useTaskFilterStore.getState().onlyInProgress).toBe(false);
    useTaskFilterStore.getState().toggleOnlyInProgress();
    expect(useTaskFilterStore.getState().onlyInProgress).toBe(true);
    useTaskFilterStore.getState().toggleOnlyInProgress();
    expect(useTaskFilterStore.getState().onlyInProgress).toBe(false);
  });

  describe("filterTasks", () => {
    const tasks: Task[] = [
      { _id: "1", title: "T1", status: "pending", priority: "Low", categoryId: null, projectId: null, startDate: "" },
      { _id: "2", title: "T2", status: "in-progress", priority: "Medium", categoryId: null, projectId: null, startDate: "" },
      { _id: "3", title: "T3", status: "completed", priority: "High", categoryId: null, projectId: null, startDate: "" },
    ];

    it("returns all tasks when onlyInProgress is false", () => {
      expect(filterTasks(tasks, false)).toEqual(tasks);
    });

    it("filters only in-progress tasks when onlyInProgress is true", () => {
      const filtered = filterTasks(tasks, true);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]._id).toBe("2");
    });

    it("handles non-array inputs safely", () => {
      expect(filterTasks(null as unknown as Task[], true)).toEqual([]);
      expect(filterTasks(undefined as unknown as Task[], true)).toEqual([]);
    });
  });
});
