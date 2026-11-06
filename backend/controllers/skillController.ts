import type { Request, Response } from "express";
import { personalSkillService } from "../services/personalSkillService.js";
import { listTemplates, readTemplate } from "../skills/templates/registry.js";
import type { SkillInput, SkillUpdateInput } from "../types/IUserSkill.js";

export const listSkills = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = String(req.user!._id);
  const data = await personalSkillService.list(userId);
  res.status(200).json({ data });
};

export const createSkill = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = String(req.user!._id);
  const input = req.validatedBody as unknown as SkillInput;
  const data = await personalSkillService.create(userId, input);
  res.status(201).json({ data });
};

export const getSkillById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = String(req.user!._id);
  const skillId = String(req.params.skillId);
  const data = await personalSkillService.get(userId, skillId);
  res.status(200).json({ data });
};

export const updateSkill = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = String(req.user!._id);
  const skillId = String(req.params.skillId);
  const { expectedVersion, ...input } =
    req.validatedBody as unknown as SkillUpdateInput;
  const data = await personalSkillService.update(
    userId,
    skillId,
    expectedVersion,
    input,
  );
  res.status(200).json({ data });
};

export const deleteSkill = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = String(req.user!._id);
  const skillId = String(req.params.skillId);
  const expectedVersion = Number(
    (req.validatedQuery as { expectedVersion: number })?.expectedVersion ??
      req.query.expectedVersion,
  );
  const data = await personalSkillService.remove(
    userId,
    skillId,
    expectedVersion,
  );
  res.status(200).json({ data });
};

export const listSkillTemplates = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const data = listTemplates();
  res.status(200).json({ data });
};

export const getSkillTemplateById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const templateId = String(req.params.templateId);
  const data = readTemplate(templateId);
  res.status(200).json({ data });
};

export const importSkillFromTemplate = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = String(req.user!._id);
  const { templateId, expectedTemplateVersion } = req.validatedBody as {
    templateId: string;
    expectedTemplateVersion: string;
  };
  const data = await personalSkillService.importTemplate(
    userId,
    templateId,
    expectedTemplateVersion,
  );
  res.status(201).json({ data });
};
