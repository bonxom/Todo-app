export type RequiredSkillDocument = Readonly<{ skillId: string; document: string }>;

const coreRequirements = Object.freeze([]) as readonly RequiredSkillDocument[];

const businessTools = new Set([
  "orbit_get_me",
  "orbit_list_tasks",
  "orbit_get_task",
  "orbit_list_projects",
  "orbit_list_categories",
  "orbit_create_task",
  "orbit_update_task",
]);

const specialistTools = new Map<string, readonly RequiredSkillDocument[]>([
  ["specialist_tool", Object.freeze([{ skillId: "ielts", document: "SKILL.md" }])],
]);

/** Undefined is deny-by-default; an empty array means core tools permitted without skill prerequisites. */
export function requiredSkillDocuments(name: string): readonly RequiredSkillDocument[] | undefined {
  if (businessTools.has(name)) return coreRequirements;
  return specialistTools.get(name);
}
