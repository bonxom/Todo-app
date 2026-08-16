import { beforeEach, describe, expect, it } from "vitest";
import { filterTasks, useTaskFilterStore } from "../useTaskFilterStore";
import type { Task } from "@/shared/types/domain";

describe("useTaskFilterStore", () => {
  beforeEach(() => {
    useTaskFilterStore.setState({ selectedStatuses: [] });
  });

  it("stores all selected task statuses", () => {
    useTaskFilterStore.getState().setSelectedStatuses(["pending", "completed"]);

    expect(useTaskFilterStore.getState().selectedStatuses).toEqual(["pending", "completed"]);
  });

  describe("filterTasks", () => {
    const tasks: Task[] = [
      { _id: "1", title: "T1", status: "pending", priority: "Low", categoryId: null, projectId: null, startDate: "" },
      { _id: "2", title: "T2", status: "in-progress", priority: "Medium", categoryId: null, projectId: null, startDate: "" },
      { _id: "3", title: "T3", status: "completed", priority: "High", categoryId: null, projectId: null, startDate: "" },
      { _id: "4", title: "T4", status: "given-up", priority: "High", categoryId: null, projectId: null, startDate: "" },
    ];

    it("returns all tasks when no statuses are selected", () => {
      expect(filterTasks(tasks, [])).toEqual(tasks);
    });

    it("returns tasks matching every selected status", () => {
      expect(filterTasks(tasks, ["pending", "completed"])).toEqual([tasks[0], tasks[2]]);
    });

    it("handles non-array task inputs safely", () => {
      expect(filterTasks(null as unknown as Task[], ["pending"])).toEqual([]);
      expect(filterTasks(undefined as unknown as Task[], ["pending"])).toEqual([]);
    });
  });
});
