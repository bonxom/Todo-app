import { describe, expect, it } from "vitest";
import {
  createPersonalSkillSession,
  type PersonalSkillSnapshot,
} from "../agentPersonalSkillService.js";
import { SkillError } from "../../skills/types.js";

describe("agentPersonalSkillService", () => {
  const enabledSkill1 = {
    id: "a1b2c3d4-0001-0000-0000-000000000001",
    name: "Essay Helper",
    description: "Helps outline essays",
    version: 1,
    instructions: "Always structure: intro, body, conclusion.",
  };

  const enabledSkill2 = {
    id: "a1b2c3d4-0002-0000-0000-000000000002",
    name: "Math Tutor",
    description: "Helps with calculus",
    version: 2,
    instructions: "Show step-by-step differentiation.",
  };

  const snapshot: PersonalSkillSnapshot = [enabledSkill1, enabledSkill2];

  it("list() returns overview omitting instructions and containing when-to-use descriptions", () => {
    const session = createPersonalSkillSession(snapshot);
    const listResult = session.list();

    expect(listResult.skills).toHaveLength(2);
    expect(listResult.skills[0]).toEqual({
      id: enabledSkill1.id,
      name: enabledSkill1.name,
      description: enabledSkill1.description,
      version: enabledSkill1.version,
    });
    expect(JSON.stringify(listResult)).not.toContain(
      enabledSkill1.instructions,
    );
    expect(JSON.stringify(listResult)).not.toContain(
      enabledSkill2.instructions,
    );
  });

  it("read() returns instructions on valid skillId and exact version", () => {
    const session = createPersonalSkillSession(snapshot);

    const result = session.read({
      skillId: enabledSkill1.id,
      version: enabledSkill1.version,
    });

    expect(result).toEqual({
      id: enabledSkill1.id,
      name: enabledSkill1.name,
      version: enabledSkill1.version,
      instructions: enabledSkill1.instructions,
    });

    expect(session.reads()).toEqual([
      {
        id: enabledSkill1.id,
        name: enabledSkill1.name,
        version: enabledSkill1.version,
      },
    ]);
  });

  it("read() throws SKILL_NOT_FOUND when skillId is not in snapshot", () => {
    const session = createPersonalSkillSession(snapshot);

    expect(() =>
      session.read({
        skillId: "00000000-0000-0000-0000-000000000099",
        version: 1,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "SKILL_NOT_FOUND",
      }),
    );
  });

  it("read() throws SKILL_VERSION_CONFLICT on version mismatch", () => {
    const session = createPersonalSkillSession(snapshot);

    expect(() =>
      session.read({
        skillId: enabledSkill1.id,
        version: 99,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "SKILL_VERSION_CONFLICT",
      }),
    );
  });

  it("deduplicates budget for repeated reads of the same skill", () => {
    const session = createPersonalSkillSession(snapshot);

    const r1 = session.read({
      skillId: enabledSkill1.id,
      version: enabledSkill1.version,
    });
    const r2 = session.read({
      skillId: enabledSkill1.id,
      version: enabledSkill1.version,
    });

    expect(r1).toEqual(r2);
    // reads() contains only one entry for that skill
    expect(session.reads()).toHaveLength(1);
  });

  it("enforces 30000 character limit per turn across distinct skills", () => {
    const largeSkill1 = {
      id: "large-skill-0001",
      name: "Large 1",
      description: "Desc 1",
      version: 1,
      instructions: "A".repeat(16000),
    };
    const largeSkill2 = {
      id: "large-skill-0002",
      name: "Large 2",
      description: "Desc 2",
      version: 1,
      instructions: "B".repeat(16000),
    };

    const session = createPersonalSkillSession([largeSkill1, largeSkill2]);

    // First read (16000 chars) succeeds
    expect(session.read({ skillId: largeSkill1.id, version: 1 })).toBeDefined();

    // Second read would bring total to 32000 chars > 30000 cap -> throws SKILL_CONTENT_TOO_LARGE
    expect(() => session.read({ skillId: largeSkill2.id, version: 1 })).toThrow(
      expect.objectContaining({
        code: "SKILL_CONTENT_TOO_LARGE",
      }),
    );

    // Only the first skill was successfully recorded in reads()
    expect(session.reads()).toEqual([
      { id: largeSkill1.id, name: largeSkill1.name, version: 1 },
    ]);
  });

  it("maintains strict snapshot isolation between two sessions", () => {
    const sessionA = createPersonalSkillSession([enabledSkill1]);
    const sessionB = createPersonalSkillSession([enabledSkill2]);

    expect(sessionA.list().skills).toHaveLength(1);
    expect(sessionA.list().skills[0].id).toBe(enabledSkill1.id);

    expect(sessionB.list().skills).toHaveLength(1);
    expect(sessionB.list().skills[0].id).toBe(enabledSkill2.id);

    expect(() =>
      sessionA.read({
        skillId: enabledSkill2.id,
        version: enabledSkill2.version,
      }),
    ).toThrow();
  });
});

it("isolates snapshot records and overview from caller mutation", () => {
  const item = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Original",
    description: "Desc",
    instructions: "Original instructions",
    version: 1,
  };
  const session = createPersonalSkillSession([item]);
  item.instructions = "Changed";
  session.list().skills[0]!.name = "Changed overview";
  expect(session.read({ skillId: item.id, version: 1 }).instructions).toBe(
    "Original instructions",
  );
  expect(session.list().skills[0]!.name).toBe("Original");
});
