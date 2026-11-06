import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

const projectMock = vi.hoisted(() => ({
  findOne: vi.fn(),
}));

const conversationRepoMock = vi.hoisted(() => ({
  updateContext: vi.fn(),
}));

vi.mock("../../models/Project.js", () => ({
  default: projectMock,
}));

vi.mock("../../repositories/conversationRepository.js", () => ({
  conversationRepository: conversationRepoMock,
}));

import { conversationContextService } from "../conversationContextService.js";
import { conversationContextSchema } from "../../validations/aiValidation.js";
import { AI_ERROR } from "../../error/definitions/aiErrors.js";
import { PROJECT_ERROR } from "../../error/definitions/projectErrors.js";
import { AppError } from "../../error/AppError.js";

describe("conversationContextService", () => {
  const userA = new mongoose.Types.ObjectId().toString();
  const conversationId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("schema validation", () => {
    it("accepts a valid 24-char hex projectId", () => {
      const parsed = conversationContextSchema.parse({ projectId });
      expect(parsed.projectId).toBe(projectId);
    });

    it("accepts null projectId for clearing context", () => {
      const parsed = conversationContextSchema.parse({ projectId: null });
      expect(parsed.projectId).toBeNull();
    });

    it("rejects invalid projectId format", () => {
      expect(() =>
        conversationContextSchema.parse({ projectId: "invalid-id" }),
      ).toThrow();
    });

    it("strictly rejects extra fields", () => {
      expect(() =>
        conversationContextSchema.parse({
          projectId,
          extraField: "not-allowed",
        }),
      ).toThrow();
    });
  });

  describe("service context updates", () => {
    it("rejects with 404 when project does not exist or is not owned by user", async () => {
      projectMock.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(
        conversationContextService.update(userA, conversationId, projectId),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: PROJECT_ERROR.NOT_FOUND.code,
      });

      expect(projectMock.findOne).toHaveBeenCalledWith({
        _id: projectId,
        userId: userA,
      });
      expect(conversationRepoMock.updateContext).not.toHaveBeenCalled();
    });

    it("allows a completed project to be selected as context", async () => {
      projectMock.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: projectId,
          userId: userA,
          title: "Completed Project",
          status: "completed",
        }),
      });

      conversationRepoMock.updateContext.mockResolvedValue({
        _id: conversationId,
        contextProjectId: projectId,
      });

      const result = await conversationContextService.update(
        userA,
        conversationId,
        projectId,
      );

      expect(result).toEqual({
        conversationId,
        contextProjectId: projectId,
      });
      expect(conversationRepoMock.updateContext).toHaveBeenCalledWith(
        userA,
        conversationId,
        projectId,
      );
    });

    it("clears project context when projectId is null without querying project", async () => {
      conversationRepoMock.updateContext.mockResolvedValue({
        _id: conversationId,
        contextProjectId: null,
      });

      const result = await conversationContextService.update(
        userA,
        conversationId,
        null,
      );

      expect(result).toEqual({
        conversationId,
        contextProjectId: null,
      });
      expect(projectMock.findOne).not.toHaveBeenCalled();
      expect(conversationRepoMock.updateContext).toHaveBeenCalledWith(
        userA,
        conversationId,
        null,
      );
    });

    it("propagates 404 when user A attempts to update user B conversation", async () => {
      projectMock.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: projectId,
          userId: userA,
          title: "Project A",
        }),
      });

      conversationRepoMock.updateContext.mockRejectedValue(
        new AppError(AI_ERROR.CONVERSATION_NOT_FOUND),
      );

      await expect(
        conversationContextService.update(userA, conversationId, projectId),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: AI_ERROR.CONVERSATION_NOT_FOUND.code,
      });
    });

    it("propagates 409 when conversation has an active busy lease", async () => {
      projectMock.findOne.mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: projectId,
          userId: userA,
          title: "Project A",
        }),
      });

      conversationRepoMock.updateContext.mockRejectedValue(
        new AppError(AI_ERROR.CONVERSATION_BUSY),
      );

      await expect(
        conversationContextService.update(userA, conversationId, projectId),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: AI_ERROR.CONVERSATION_BUSY.code,
      });
    });
  });
});
