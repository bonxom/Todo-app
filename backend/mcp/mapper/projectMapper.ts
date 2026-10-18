import { projectDtoSchema } from "../schemas.js";
import type { ProjectDto } from "../schemas.js";
import { referenceId } from "./shared.js";

export function toProjectDto(project: Record<string, unknown>): ProjectDto {
  return projectDtoSchema.parse({
    id: referenceId(project._id),
    name: project.name,
    description: project.description ?? null,
    color: project.color,
    status: project.status,
  });
}
