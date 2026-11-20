import { describe, expect, it, vi } from "vitest";
import { conversationRepository } from "../../repositories/conversationRepository.js";
import { projectRepository } from "../../repositories/projectRepository.js";
import { conversationCreateSchema } from "../../validations/aiValidation.js";
import { conversationService } from "../conversationService.js";

const userId = "507f1f77bcf86cd799439011";
const projectId = "507f1f77bcf86cd799439012";
const conversationId = "a9fdad79-0cd8-4862-9b6a-1b095f42b226";

describe("project-scoped conversation creation", () => {
  it("validates project IDs while preserving the existing request shape", () => {
    expect(conversationCreateSchema.parse({ conversationId })).toEqual({
      conversationId,
    });
    expect(
      conversationCreateSchema.parse({ conversationId, projectId }),
    ).toEqual({ conversationId, projectId });
    expect(
      conversationCreateSchema.safeParse({ conversationId, projectId: "bad" })
        .success,
    ).toBe(false);
  });

  it("rejects a project outside the caller's ownership before creating a conversation", async () => {
    const findOwned = vi
      .spyOn(projectRepository, "findOwnedById")
      .mockResolvedValueOnce(null);
    const create = vi
      .spyOn(conversationRepository, "create")
      .mockResolvedValueOnce({} as never);
    try {
      await expect(
        conversationService.create(userId, conversationId, projectId),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(findOwned).toHaveBeenCalledWith(projectId, userId);
      expect(create).not.toHaveBeenCalled();
    } finally {
      findOwned.mockRestore();
      create.mockRestore();
    }
  });
});
