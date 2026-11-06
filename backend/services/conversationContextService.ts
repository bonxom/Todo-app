import { projectRepository } from "../repositories/projectRepository.js";
import { conversationRepository } from "../repositories/conversationRepository.js";
import { AppError } from "../error/AppError.js";
import { PROJECT_ERROR } from "../error/definitions/projectErrors.js";

export const conversationContextService = {
  async update(
    userId: string,
    conversationId: string,
    projectId: string | null,
  ): Promise<{ conversationId: string; contextProjectId: string | null }> {
    if (projectId !== null) {
      const project = await projectRepository.findOwnedById(projectId, userId);
      if (!project) {
        throw new AppError(PROJECT_ERROR.NOT_FOUND);
      }
    }

    const updated = await conversationRepository.updateContext(
      userId,
      conversationId,
      projectId,
    );

    return {
      conversationId: String(updated._id),
      contextProjectId: updated.contextProjectId
        ? String(updated.contextProjectId)
        : null,
    };
  },
};
