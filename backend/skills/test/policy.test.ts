import { describe, expect, it } from "vitest";
import { requiredSkillDocuments } from "../policy.js";

describe("business skill policy", () => {
  it.each(["orbit_get_me", "orbit_list_tasks", "orbit_get_task", "orbit_list_projects", "orbit_list_categories", "orbit_create_task", "orbit_update_task"])("permits %s as a core tool without skill prerequisites", (name) => {
    expect(requiredSkillDocuments(name)).toEqual([]);
  });
  it("requires skill documents for specialist tools", () => {
    expect(requiredSkillDocuments("specialist_tool")).toEqual([{ skillId: "ielts", document: "SKILL.md" }]);
  });
  it.each(["unknown", "toString", "load_skill", "grill_user"])("does not map %s", (name) => {
    expect(requiredSkillDocuments(name)).toBeUndefined();
  });
});
