import { describe, expect, it } from "vitest";
import { taskKeys } from "../taskKeys";
import { projectKeys } from "../projectKeys";
import { categoryKeys } from "@/features/categories/api/categoryKeys";
import { statKeys } from "@/features/statistics/api/statKeys";
import { userKeys } from "@/features/profile/api/userKeys";

describe("query keys", () => {
  describe("taskKeys", () => {
    it("generates exact hierarchy keys", () => {
      expect(taskKeys.all).toEqual(["tasks"]);
      expect(taskKeys.lists()).toEqual(["tasks", "list"]);
      expect(taskKeys.list({ projectId: "p1", status: undefined })).toEqual(["tasks", "list", { projectId: "p1" }]);
      expect(taskKeys.detail("t1")).toEqual(["tasks", "detail", "t1"]);
      expect(taskKeys.calendarRoot()).toEqual(["tasks", "calendar"]);
      expect(
        taskKeys.calendar({
          startDate: "2026-08-01T00:00:00.000Z",
          endDate: "2026-08-31T23:59:59.999Z",
        })
      ).toEqual([
        "tasks",
        "calendar",
        {
          startDate: "2026-08-01T00:00:00.000Z",
          endDate: "2026-08-31T23:59:59.999Z",
        },
      ]);
    });

    it("preserves null filter properties while stripping undefined and empty strings", () => {
      expect(taskKeys.list({ projectId: null, status: "", categoryId: undefined })).toEqual([
        "tasks",
        "list",
        { projectId: null },
      ]);
    });
  });

  describe("projectKeys", () => {
    it("generates exact project keys", () => {
      expect(projectKeys.all).toEqual(["projects"]);
      expect(projectKeys.list()).toEqual(["projects", "list"]);
      expect(projectKeys.detail("p1")).toEqual(["projects", "detail", "p1"]);
      expect(projectKeys.tasks("p1")).toEqual(["projects", "tasks", "p1"]);
    });
  });

  describe("categoryKeys", () => {
    it("generates exact category keys", () => {
      expect(categoryKeys.all).toEqual(["categories"]);
      expect(categoryKeys.list()).toEqual(["categories", "list"]);
      expect(categoryKeys.detail("c1")).toEqual(["categories", "detail", "c1"]);
      expect(categoryKeys.tasks("c1")).toEqual(["categories", "tasks", "c1"]);
    });
  });

  describe("statKeys", () => {
    it("generates exact stat keys", () => {
      expect(statKeys.all).toEqual(["stats"]);
      expect(statKeys.summary()).toEqual(["stats", "summary"]);
      expect(statKeys.activity({ date: "2026-08-14" })).toEqual(["stats", "activity", { date: "2026-08-14" }]);
    });
  });

  describe("userKeys", () => {
    it("generates exact user keys", () => {
      expect(userKeys.all).toEqual(["users"]);
      expect(userKeys.me()).toEqual(["users", "me"]);
    });
  });
});
