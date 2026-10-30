export const SKILL_CATALOG = [
  {
    id: "gym",
    name: "gym",
    label: "Gym Plan",
    description: "Workout routines, split schedules & nutrition",
    category: "skill",
    iconName: "Dumbbell",
  },
  {
    id: "ielts",
    name: "ielts",
    label: "IELTS Prep",
    description: "Practice tests, guidance and Writing/Speaking evaluation",
    category: "skill",
    iconName: "GraduationCap",
  },
];

export const TOOL_CATALOG = SKILL_CATALOG;

export function filterTools(query = "") {
  const clean = query.trim().toLowerCase().replace(/^\//, "");
  if (!clean) return SKILL_CATALOG;
  return SKILL_CATALOG.filter(
    (skill) =>
      skill.id.toLowerCase().includes(clean) ||
      skill.label.toLowerCase().includes(clean) ||
      skill.description.toLowerCase().includes(clean),
  );
}
