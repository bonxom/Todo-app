import axiosInstance from "./httpClient";
import type {
  SkillSummary,
  SkillDetail,
  TemplateSummary,
  TemplateDetail,
  SkillCreateInput,
  SkillUpdateInput,
} from "../types/skill";

export const skillService = {
  list: async (): Promise<SkillSummary[]> => {
    const response = await axiosInstance.get<{ data: SkillSummary[] }>(
      "/api/ai/skills",
    );
    return response.data.data;
  },

  get: async (id: string): Promise<SkillDetail> => {
    const response = await axiosInstance.get<{ data: SkillDetail }>(
      `/api/ai/skills/${id}`,
    );
    return response.data.data;
  },

  create: async (input: SkillCreateInput): Promise<SkillDetail> => {
    const response = await axiosInstance.post<{ data: SkillDetail }>(
      "/api/ai/skills",
      input,
    );
    return response.data.data;
  },

  update: async (id: string, input: SkillUpdateInput): Promise<SkillDetail> => {
    const response = await axiosInstance.put<{ data: SkillDetail }>(
      `/api/ai/skills/${id}`,
      input,
    );
    return response.data.data;
  },

  remove: async (
    id: string,
    expectedVersion: number,
  ): Promise<{ id: string }> => {
    const response = await axiosInstance.delete<{ data: { id: string } }>(
      `/api/ai/skills/${id}`,
      {
        params: { expectedVersion },
      },
    );
    return response.data.data;
  },

  templates: async (): Promise<TemplateSummary[]> => {
    const response = await axiosInstance.get<{ data: TemplateSummary[] }>(
      "/api/ai/skill-templates",
    );
    return response.data.data;
  },

  template: async (templateId: string): Promise<TemplateDetail> => {
    const response = await axiosInstance.get<{ data: TemplateDetail }>(
      `/api/ai/skill-templates/${templateId}`,
    );
    return response.data.data;
  },

  importTemplate: async (
    templateId: string,
    expectedTemplateVersion: string,
  ): Promise<SkillDetail> => {
    const response = await axiosInstance.post<{ data: SkillDetail }>(
      "/api/ai/skills/from-template",
      {
        templateId,
        expectedTemplateVersion,
      },
    );
    return response.data.data;
  },
};
