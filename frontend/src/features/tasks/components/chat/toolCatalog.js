export const SKILL_CATALOG = [
  {
    id: "gym",
    name: "gym",
    label: "Gym plan",
    description: "Workout schedules, splits, and nutrition",
    category: "skill",
    iconName: "Dumbbell",
  },
  {
    id: "ielts",
    name: "ielts",
    label: "IELTS practice",
    description: "Writing and speaking practice and feedback",
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
