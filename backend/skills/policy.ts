export type RequiredSkillDocument = Readonly<{
  skillId: string;
  document: string;
}>;

export type AdditionalSkillRequirements =
  | ReadonlyMap<string, readonly RequiredSkillDocument[]>
  | Record<string, readonly RequiredSkillDocument[]>;

const coreRequirements = Object.freeze([]) as readonly RequiredSkillDocument[];

const businessTools = new Set([
  "orbit_get_me",
  "orbit_list_tasks",
  "orbit_get_task",
  "orbit_list_projects",
  "orbit_list_categories",
  "orbit_create_task",
  "orbit_update_task",
  "orbit_delete_task",
]);

const specialistTools = new Map<string, readonly RequiredSkillDocument[]>([
  [
    "specialist_tool",
    Object.freeze([{ skillId: "ielts", document: "SKILL.md" }]),
  ],
]);

/** Undefined is deny-by-default; an empty array means core tools permitted without skill prerequisites. */
export function requiredSkillDocuments(
  name: string,
): readonly RequiredSkillDocument[] | undefined {
  if (businessTools.has(name)) return coreRequirements;
  return specialistTools.get(name);
}

/** Merge per-session tool requirements without weakening any existing static policy. */
export function resolveRequiredSkillDocuments(
  name: string,
  additional?: ReadonlyMap<string, readonly RequiredSkillDocument[]>,
): readonly RequiredSkillDocument[] | undefined {
  const base = requiredSkillDocuments(name);
  const extra = additional?.get(name);
  if (base === undefined && extra === undefined) return undefined;
  if (base !== undefined && extra === undefined) return base;
  if (base === undefined && extra !== undefined) {
    return extra.length > 0 ? extra : undefined;
  }
  return [...base!, ...extra!];
}
