import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import axiosInstance from "../httpClient";
import { skillService } from "../skillService";
import type {
  SkillSummary,
  SkillDetail,
  TemplateSummary,
  TemplateDetail,
} from "../../types/skill";

describe("skillService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists all personal skills", async () => {
    const mockList: SkillSummary[] = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "IELTS Writing",
        description: "Task 2 rubric",
        enabled: true,
        version: 1,
        updatedAt: "2026-11-06T00:00:00.000Z",
      },
    ];

    const getSpy = vi.spyOn(axiosInstance, "get").mockResolvedValueOnce({
      data: { data: mockList },
    });

    const result = await skillService.list();
    expect(result).toEqual(mockList);
    expect(getSpy).toHaveBeenCalledWith("/api/ai/skills");
  });

  it("gets a specific skill by id", async () => {
    const mockDetail: SkillDetail = {
      id: "11111111-1111-4111-8111-111111111111",
      name: "IELTS Writing",
      description: "Task 2 rubric",
      instructions: "Focus on Coherence and Cohesion.",
      enabled: true,
      version: 1,
      updatedAt: "2026-11-06T00:00:00.000Z",
    };

    const getSpy = vi.spyOn(axiosInstance, "get").mockResolvedValueOnce({
      data: { data: mockDetail },
    });

    const result = await skillService.get(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(result).toEqual(mockDetail);
    expect(getSpy).toHaveBeenCalledWith(
      "/api/ai/skills/11111111-1111-4111-8111-111111111111",
    );
  });

  it("creates a new skill", async () => {
    const input = {
      name: "Gym Workout",
      description: "Push-Pull-Legs routine",
      instructions: "Start with 10 mins warmup.",
      enabled: true,
    };
    const mockCreated: SkillDetail = {
      id: "22222222-2222-4222-8222-222222222222",
      ...input,
      version: 1,
      updatedAt: "2026-11-06T00:00:00.000Z",
    };

    const postSpy = vi.spyOn(axiosInstance, "post").mockResolvedValueOnce({
      data: { data: mockCreated },
    });

    const result = await skillService.create(input);
    expect(result).toEqual(mockCreated);
    expect(postSpy).toHaveBeenCalledWith("/api/ai/skills", input);
  });

  it("updates an existing skill with expectedVersion", async () => {
    const input = {
      expectedVersion: 1,
      name: "Gym Workout Updated",
      description: "Upper-Lower split",
      instructions: "Warmup thoroughly.",
      enabled: true,
    };
    const mockUpdated: SkillDetail = {
      id: "22222222-2222-4222-8222-222222222222",
      ...input,
      version: 2,
      updatedAt: "2026-11-06T00:00:00.000Z",
    };

    const putSpy = vi.spyOn(axiosInstance, "put").mockResolvedValueOnce({
      data: { data: mockUpdated },
    });

    const result = await skillService.update(
      "22222222-2222-4222-8222-222222222222",
      input,
    );
    expect(result).toEqual(mockUpdated);
    expect(putSpy).toHaveBeenCalledWith(
      "/api/ai/skills/22222222-2222-4222-8222-222222222222",
      input,
    );
  });

  it("removes a skill with expectedVersion in query params", async () => {
    const deleteSpy = vi.spyOn(axiosInstance, "delete").mockResolvedValueOnce({
      data: { data: { id: "22222222-2222-4222-8222-222222222222" } },
    });

    const result = await skillService.remove(
      "22222222-2222-4222-8222-222222222222",
      2,
    );
    expect(result).toEqual({ id: "22222222-2222-4222-8222-222222222222" });
    expect(deleteSpy).toHaveBeenCalledWith(
      "/api/ai/skills/22222222-2222-4222-8222-222222222222",
      { params: { expectedVersion: 2 } },
    );
  });

  it("fetches template list and template detail", async () => {
    const mockTemplates: TemplateSummary[] = [
      {
        id: "ielts",
        name: "IELTS",
        description: "IELTS test",
        version: "hash1",
      },
    ];
    const mockTemplateDetail: TemplateDetail = {
      id: "ielts",
      name: "IELTS",
      description: "IELTS test",
      version: "hash1",
      instructions: "IELTS instructions",
    };

    const getSpy = vi
      .spyOn(axiosInstance, "get")
      .mockResolvedValueOnce({ data: { data: mockTemplates } })
      .mockResolvedValueOnce({ data: { data: mockTemplateDetail } });

    const list = await skillService.templates();
    expect(list).toEqual(mockTemplates);
    expect(getSpy).toHaveBeenNthCalledWith(1, "/api/ai/skill-templates");

    const detail = await skillService.template("ielts");
    expect(detail).toEqual(mockTemplateDetail);
    expect(getSpy).toHaveBeenNthCalledWith(2, "/api/ai/skill-templates/ielts");
  });

  it("imports a template into personal skills", async () => {
    const mockImported: SkillDetail = {
      id: "33333333-3333-4333-8333-333333333333",
      name: "IELTS",
      description: "IELTS test",
      instructions: "IELTS instructions",
      enabled: true,
      version: 1,
      sourceTemplateId: "ielts",
      sourceTemplateVersion: "hash1",
      updatedAt: "2026-11-06T00:00:00.000Z",
    };

    const postSpy = vi.spyOn(axiosInstance, "post").mockResolvedValueOnce({
      data: { data: mockImported },
    });

    const result = await skillService.importTemplate("ielts", "hash1");
    expect(result).toEqual(mockImported);
    expect(postSpy).toHaveBeenCalledWith("/api/ai/skills/from-template", {
      templateId: "ielts",
      expectedTemplateVersion: "hash1",
    });
  });
});
