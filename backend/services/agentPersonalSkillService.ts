import { z } from "zod";
import type { ChatCompletionTool } from "openai/resources/chat/completions.js";
import { MAX_TURN_SKILL_CHARS, SkillError } from "../skills/types.js";

export type PersonalSkillSnapshotItem = Readonly<{
  id: string;
  name: string;
  description: string;
  version: number;
  instructions: string;
}>;

export type PersonalSkillSnapshot = ReadonlyArray<PersonalSkillSnapshotItem>;

export interface PersonalSkillReadResult {
  id: string;
  name: string;
  version: number;
  instructions: string;
}

export interface SkillReadRecord {
  id: string;
  name: string;
  version: number;
}

export interface PersonalSkillSession {
  snapshot: PersonalSkillSnapshot;
  definitions: ChatCompletionTool[];
  list(): {
    skills: Array<{
      id: string;
      name: string;
      description: string;
      version: number;
    }>;
  };
  read(args: { skillId: string; version: number }): PersonalSkillReadResult;
  reads(): SkillReadRecord[];
  isPersonalSkillTool(toolName: string): boolean;
}

export const listSkillsSchema = z.strictObject({});

export const readSkillSchema = z.strictObject({
  skillId: z.string().uuid(),
  version: z.number().int().min(1),
});

export const personalSkillToolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_skills",
      description:
        "List the current user's available personal skills. Returns an overview of skill names and descriptions without full instructions.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_skill",
      description:
        "Read the full instructions of a specific personal skill by ID and version from the catalog overview.",
      parameters: {
        type: "object",
        properties: {
          skillId: {
            type: "string",
            description: "The UUID ID of the skill to read",
          },
          version: {
            type: "integer",
            description:
              "The exact version of the skill from the list overview",
          },
        },
        required: ["skillId", "version"],
        additionalProperties: false,
      },
    },
  },
];

export function createPersonalSkillSession(
  snapshot: PersonalSkillSnapshot,
): PersonalSkillSession {
  const immutableSnapshot = Object.freeze(
    snapshot.map((item) => Object.freeze({ ...item })),
  );
  const byId = new Map<string, PersonalSkillSnapshotItem>(
    immutableSnapshot.map((s) => [s.id, s]),
  );

  const loadedSkills = new Set<string>();
  const successfulReads = new Map<string, SkillReadRecord>();
  let loadedChars = 0;

  const cachedOverview = Object.freeze({
    skills: immutableSnapshot.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      version: s.version,
    })),
  });

  return {
    snapshot: immutableSnapshot,
    definitions: structuredClone(personalSkillToolDefinitions),

    list() {
      return structuredClone(cachedOverview);
    },

    read(args: { skillId: string; version: number }): PersonalSkillReadResult {
      const skill = byId.get(args.skillId);
      if (!skill) {
        throw new SkillError(
          "SKILL_NOT_FOUND",
          `Skill ${args.skillId} not found or unavailable in this session.`,
        );
      }

      if (skill.version !== args.version) {
        throw new SkillError(
          "SKILL_VERSION_CONFLICT",
          `Skill version conflict for ${skill.name} (${skill.id}): requested version ${args.version}, but current version is ${skill.version}.`,
        );
      }

      const key = `${skill.id}:${skill.version}`;
      if (!loadedSkills.has(key)) {
        if (loadedChars + skill.instructions.length > MAX_TURN_SKILL_CHARS) {
          throw new SkillError(
            "SKILL_CONTENT_TOO_LARGE",
            `Turn skill content exceeds ${MAX_TURN_SKILL_CHARS} characters.`,
          );
        }
        loadedChars += skill.instructions.length;
        loadedSkills.add(key);
      }

      if (!successfulReads.has(key)) {
        successfulReads.set(key, {
          id: skill.id,
          name: skill.name,
          version: skill.version,
        });
      }

      return {
        id: skill.id,
        name: skill.name,
        version: skill.version,
        instructions: skill.instructions,
      };
    },

    reads(): SkillReadRecord[] {
      return Array.from(successfulReads.values(), (record) => ({ ...record }));
    },

    isPersonalSkillTool(toolName: string): boolean {
      return toolName === "list_skills" || toolName === "read_skill";
    },
  };
}
