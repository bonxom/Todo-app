import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { personalSkillService } from "../personalSkillService.js";
import { userSkillRepository } from "../../repositories/userSkillRepository.js";
import { SKILL_ERROR } from "../../error/definitions/skillErrors.js";
import { AppError } from "../../error/AppError.js";
import type { IUserSkill } from "../../types/IUserSkill.js";

vi.mock("../../repositories/userSkillRepository.js", () => ({
  userSkillRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
}));

describe("personalSkillService unit tests", () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();
  const skillId = randomUUID();

  const mockSkill: IUserSkill = {
    _id: skillId,
    userId: new mongoose.Types.ObjectId(userId),
    name: "Writing Assistant",
    description: "Helps with essay structure and tone",
    instructions: "Always outline the essay with intro, body, conclusion.",
    enabled: true,
    version: 1,
    createdAt: new Date("2026-11-06T10:00:00Z"),
    updatedAt: new Date("2026-11-06T10:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("returns summary list omitting instructions and mapping _id to id", async () => {
      const disabledSkill: IUserSkill = {
        ...mockSkill,
        _id: randomUUID(),
        name: "Disabled Skill",
        enabled: false,
        version: 2,
        updatedAt: new Date("2026-11-06T11:00:00Z"),
      };

      vi.mocked(userSkillRepository.list).mockResolvedValue([
        disabledSkill,
        mockSkill,
      ]);

      const result = await personalSkillService.list(userId);

      expect(userSkillRepository.list).toHaveBeenCalledWith(userId);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: disabledSkill._id,
        name: "Disabled Skill",
        description: disabledSkill.description,
        enabled: false,
        version: 2,
        updatedAt: disabledSkill.updatedAt.toISOString(),
      });
      expect(result[0]).not.toHaveProperty("instructions");
      expect(result[1]).toEqual({
        id: mockSkill._id,
        name: "Writing Assistant",
        description: mockSkill.description,
        enabled: true,
        version: 1,
        updatedAt: mockSkill.updatedAt.toISOString(),
      });
      expect(result[1]).not.toHaveProperty("instructions");
    });
  });

  describe("get", () => {
    it("returns skill detail with instructions for owner", async () => {
      vi.mocked(userSkillRepository.findById).mockResolvedValue(mockSkill);

      const result = await personalSkillService.get(userId, skillId);

      expect(userSkillRepository.findById).toHaveBeenCalledWith(
        userId,
        skillId,
      );
      expect(result).toEqual({
        id: mockSkill._id,
        name: mockSkill.name,
        description: mockSkill.description,
        instructions: mockSkill.instructions,
        enabled: true,
        version: 1,
        updatedAt: mockSkill.updatedAt.toISOString(),
      });
    });

    it("throws 404 SKILL_NOT_FOUND when skill does not exist or belongs to other user", async () => {
      vi.mocked(userSkillRepository.findById).mockResolvedValue(null);

      await expect(
        personalSkillService.get(otherUserId, skillId),
      ).rejects.toThrow(
        expect.objectContaining({
          code: SKILL_ERROR.SKILL_NOT_FOUND.code,
          statusCode: 404,
        }),
      );
    });
  });

  describe("create", () => {
    it("creates a skill with version 1 and returns detail", async () => {
      const input = {
        name: "Writing Assistant",
        description: "Helps with essay structure and tone",
        instructions: "Always outline the essay with intro, body, conclusion.",
        enabled: true,
      };

      vi.mocked(userSkillRepository.create).mockResolvedValue(mockSkill);

      const result = await personalSkillService.create(userId, input);

      expect(userSkillRepository.create).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          name: input.name,
          description: input.description,
          instructions: input.instructions,
          enabled: true,
        }),
      );
      expect(result).toEqual({
        id: mockSkill._id,
        name: mockSkill.name,
        description: mockSkill.description,
        instructions: mockSkill.instructions,
        enabled: true,
        version: 1,
        updatedAt: mockSkill.updatedAt.toISOString(),
      });
    });

    it("throws 409 SKILL_LIMIT_REACHED when user already has 50 skills", async () => {
      const input = {
        name: "Writing Assistant",
        description: "Helps with essay structure and tone",
        instructions: "Always outline the essay.",
        enabled: true,
      };

      vi.mocked(userSkillRepository.create).mockRejectedValue(
        new AppError(SKILL_ERROR.SKILL_LIMIT_REACHED),
      );

      await expect(personalSkillService.create(userId, input)).rejects.toThrow(
        expect.objectContaining({
          code: SKILL_ERROR.SKILL_LIMIT_REACHED.code,
          statusCode: 409,
        }),
      );
    });
  });

  describe("update", () => {
    it("updates skill with expectedVersion and returns updated detail", async () => {
      const input = {
        name: "Updated Writing Assistant",
        description: "Updated description",
        instructions: "Updated instructions",
        enabled: false,
      };

      const updatedSkill: IUserSkill = {
        ...mockSkill,
        ...input,
        version: 2,
        updatedAt: new Date("2026-11-06T12:00:00Z"),
      };

      vi.mocked(userSkillRepository.update).mockResolvedValue(updatedSkill);

      const result = await personalSkillService.update(
        userId,
        skillId,
        1,
        input,
      );

      expect(userSkillRepository.update).toHaveBeenCalledWith(
        userId,
        skillId,
        1,
        input,
      );
      expect(result.version).toBe(2);
      expect(result.name).toBe("Updated Writing Assistant");
      expect(result.enabled).toBe(false);
    });

    it("throws 409 SKILL_VERSION_CONFLICT on version mismatch", async () => {
      vi.mocked(userSkillRepository.update).mockRejectedValue(
        new AppError(SKILL_ERROR.SKILL_VERSION_CONFLICT),
      );

      await expect(
        personalSkillService.update(userId, skillId, 999, {
          name: "Conflict",
          description: "Desc",
          instructions: "Inst",
          enabled: true,
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          code: SKILL_ERROR.SKILL_VERSION_CONFLICT.code,
          statusCode: 409,
        }),
      );
    });

    it("throws 404 SKILL_NOT_FOUND if skill does not exist", async () => {
      vi.mocked(userSkillRepository.update).mockRejectedValue(
        new AppError(SKILL_ERROR.SKILL_NOT_FOUND),
      );

      await expect(
        personalSkillService.update(userId, skillId, 1, {
          name: "Missing",
          description: "Desc",
          instructions: "Inst",
          enabled: true,
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          code: SKILL_ERROR.SKILL_NOT_FOUND.code,
          statusCode: 404,
        }),
      );
    });
  });

  describe("remove", () => {
    it("deletes skill and returns id", async () => {
      vi.mocked(userSkillRepository.delete).mockResolvedValue({ id: skillId });

      const result = await personalSkillService.remove(userId, skillId, 1);

      expect(userSkillRepository.delete).toHaveBeenCalledWith(
        userId,
        skillId,
        1,
      );
      expect(result).toEqual({ id: skillId });
    });

    it("throws 409 SKILL_VERSION_CONFLICT if expectedVersion does not match", async () => {
      vi.mocked(userSkillRepository.delete).mockRejectedValue(
        new AppError(SKILL_ERROR.SKILL_VERSION_CONFLICT),
      );

      await expect(
        personalSkillService.remove(userId, skillId, 999),
      ).rejects.toThrow(
        expect.objectContaining({
          code: SKILL_ERROR.SKILL_VERSION_CONFLICT.code,
          statusCode: 409,
        }),
      );
    });

    it("throws 404 SKILL_NOT_FOUND if skill does not exist", async () => {
      vi.mocked(userSkillRepository.delete).mockRejectedValue(
        new AppError(SKILL_ERROR.SKILL_NOT_FOUND),
      );

      await expect(
        personalSkillService.remove(userId, skillId, 1),
      ).rejects.toThrow(
        expect.objectContaining({
          code: SKILL_ERROR.SKILL_NOT_FOUND.code,
          statusCode: 404,
        }),
      );
    });
  });
});
