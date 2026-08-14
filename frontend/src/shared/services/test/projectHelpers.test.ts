import { describe, expect, it } from "vitest";
import {
  buildTaskMutationPayload,
  normalizeCollectionResponse,
  normalizeEntityResponse,
  normalizeProject,
  normalizeProjects,
  normalizeProjectTasks,
} from "../projectHelpers";

describe("projectHelpers", () => {
  describe("normalizeEntityResponse", () => {
    it("extracts entity from wrapped object", () => {
      expect(normalizeEntityResponse({ project: { _id: "p1", name: "P1" } }, "project")).toEqual({
        _id: "p1",
        name: "P1",
      });
    });

    it("returns raw payload if not wrapped", () => {
      expect(normalizeEntityResponse({ _id: "p1", name: "P1" }, "project")).toEqual({
        _id: "p1",
        name: "P1",
      });
      expect(normalizeEntityResponse(null, "project")).toBeNull();
    });
  });

  describe("normalizeCollectionResponse", () => {
    it("returns array if payload is already an array", () => {
      const list = [{ _id: "1" }, { _id: "2" }];
      expect(normalizeCollectionResponse(list, "tasks")).toEqual(list);
    });

    it("extracts array from wrapped collection object", () => {
      const list = [{ _id: "1" }];
      expect(normalizeCollectionResponse({ tasks: list }, "tasks")).toEqual(list);
    });

    it("returns empty array for invalid payload", () => {
      expect(normalizeCollectionResponse(null, "tasks")).toEqual([]);
      expect(normalizeCollectionResponse({}, "tasks")).toEqual([]);
      expect(normalizeCollectionResponse({ tasks: "not-an-array" }, "tasks")).toEqual([]);
    });
  });

  describe("buildTaskMutationPayload", () => {
    it("converts empty string projectId to null", () => {
      expect(buildTaskMutationPayload({ title: "Task 1", projectId: "" as unknown as null })).toEqual({
        title: "Task 1",
        projectId: null,
      });
    });

    it("preserves null projectId", () => {
      expect(buildTaskMutationPayload({ title: "Task 1", projectId: null })).toEqual({
        title: "Task 1",
        projectId: null,
      });
    });

    it("preserves string projectId", () => {
      expect(buildTaskMutationPayload({ title: "Task 1", projectId: "proj-1" })).toEqual({
        title: "Task 1",
        projectId: "proj-1",
      });
    });

    it("removes undefined projectId", () => {
      const payload = buildTaskMutationPayload({ title: "Task 1", projectId: undefined });
      expect(payload).toEqual({ title: "Task 1" });
      expect("projectId" in payload).toBe(false);
    });
  });

  describe("normalizeProject and normalizeProjects", () => {
    it("normalizes wrapped and unwrapped project", () => {
      const proj = { _id: "p1", name: "Project 1", description: "", color: "#fff", status: "active" as const };
      expect(normalizeProject({ project: proj })).toEqual(proj);
      expect(normalizeProject(proj)).toEqual(proj);
    });

    it("normalizes wrapped and unwrapped projects array", () => {
      const projects = [
        {
          _id: "p1",
          name: "Project 1",
          description: "",
          color: "#fff",
          status: "active" as const,
          summary: {
            totalTasks: 0,
            finishedTasks: 0,
            pendingTasks: 0,
            inProgressTasks: 0,
            completedTasks: 0,
            givenUpTasks: 0,
            scheduledTasks: 0,
            canComplete: false,
            completionRate: 0,
          },
        },
      ];
      expect(normalizeProjects({ projects })).toEqual(projects);
      expect(normalizeProjects(projects)).toEqual(projects);
    });
  });

  describe("normalizeProjectTasks", () => {
    it("normalizes wrapped project and tasks", () => {
      const raw = {
        project: { project: { _id: "p1", name: "P1", description: "", color: "#fff", status: "active" as const } },
        tasks: { tasks: [{ _id: "t1", title: "Task 1", status: "pending" as const, priority: "Medium" as const, categoryId: null, projectId: "p1", startDate: "2026-01-01" }] },
      };
      const result = normalizeProjectTasks(raw);
      expect(result.project).toEqual({ _id: "p1", name: "P1", description: "", color: "#fff", status: "active" });
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]._id).toBe("t1");
    });
  });
});
