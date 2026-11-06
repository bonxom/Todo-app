import { userSkillRepository } from "../repositories/userSkillRepository.js";
import { readTemplate } from "../skills/templates/registry.js";
import type { PersonalSkillSnapshot } from "./agentPersonalSkillService.js";
import type {
  IUserSkill,
  SkillDetail,
  SkillInput,
  SkillSummary,
} from "../types/IUserSkill.js";
import { AppError } from "../error/AppError.js";
import { SKILL_ERROR } from "../error/definitions/skillErrors.js";

function toIsoDate(date: Date | string): string {
  return date instanceof Date
    ? date.toISOString()
    : new Date(date).toISOString();
}

function toSkillSummary(skill: IUserSkill): SkillSummary {
  const summary: SkillSummary = {
    id: skill._id,
    name: skill.name,
    description: skill.description,
    enabled: skill.enabled,
    version: skill.version,
    updatedAt: toIsoDate(skill.updatedAt),
  };
  if (skill.sourceTemplateId) {
    summary.sourceTemplateId = skill.sourceTemplateId;
  }
  if (skill.sourceTemplateVersion) {
    summary.sourceTemplateVersion = skill.sourceTemplateVersion;
  }
  return summary;
}

function toSkillDetail(skill: IUserSkill): SkillDetail {
  return {
    ...toSkillSummary(skill),
    instructions: skill.instructions,
  };
}

export const personalSkillService = {
  async list(userId: string): Promise<SkillSummary[]> {
    const skills = await userSkillRepository.list(userId);
    return skills.map(toSkillSummary);
  },

  async get(userId: string, id: string): Promise<SkillDetail> {
    const skill = await userSkillRepository.findById(userId, id);
    if (!skill) {
      throw new AppError(SKILL_ERROR.SKILL_NOT_FOUND);
    }
    return toSkillDetail(skill);
  },

  async create(userId: string, input: SkillInput): Promise<SkillDetail> {
    const created = await userSkillRepository.create(userId, input);
    return toSkillDetail(created);
  },

  async update(
    userId: string,
    id: string,
    expectedVersion: number,
    input: {
      name: string;
      description: string;
      instructions: string;
      enabled: boolean;
    },
  ): Promise<SkillDetail> {
    const updated = await userSkillRepository.update(
      userId,
      id,
      expectedVersion,
      input,
    );
    return toSkillDetail(updated);
  },

  async remove(
    userId: string,
    id: string,
    expectedVersion: number,
  ): Promise<{ id: string }> {
    return userSkillRepository.delete(userId, id, expectedVersion);
  },

  async importTemplate(
    userId: string,
    templateId: string,
    expectedTemplateVersion: string,
  ): Promise<SkillDetail> {
    const template = readTemplate(templateId);
    if (template.version !== expectedTemplateVersion) {
      throw new AppError(SKILL_ERROR.TEMPLATE_VERSION_CONFLICT);
    }

    const created = await userSkillRepository.create(userId, {
      name: template.name,
      description: template.description,
      instructions: template.instructions,
      enabled: true,
      sourceTemplateId: template.id,
      sourceTemplateVersion: template.version,
    });

    return toSkillDetail(created);
  },

  async getEnabledSnapshot(userId: string): Promise<PersonalSkillSnapshot> {
    const enabled = await userSkillRepository.listEnabled(userId);
    return Object.freeze(
      enabled.map((s) =>
        Object.freeze({
          id: s._id,
          name: s.name,
          description: s.description,
          version: s.version,
          instructions: s.instructions,
        }),
      ),
    );
  },
};
