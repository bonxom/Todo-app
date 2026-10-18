import type { ICategoryDocument } from "../../types/ICategory.js";
import { categoryDtoSchema } from "../schemas.js";
import type { CategoryDto } from "../schemas.js";
import { referenceId } from "./shared.js";

export function toCategoryDto(category: ICategoryDocument): CategoryDto {
  return categoryDtoSchema.parse({
    id: referenceId(category._id),
    name: category.name,
    description: category.description ?? null,
  });
}
