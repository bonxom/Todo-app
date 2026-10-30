export const MAX_DOCUMENT_CHARS = 10_000;
export const MAX_TURN_SKILL_CHARS = 30_000;

export type SkillSummary = Readonly<{
  id: string;
  description: string;
  version: string;
}>;

export type SkillDocument = Readonly<{
  skillId: string;
  document: string;
  version: string;
  uri: string;
  text: string;
}>;

export interface SkillRegistry {
  list(): SkillSummary[];
  read(skillId: string, document?: string): SkillDocument;
  documents(): SkillDocument[];
}

export class SkillError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SkillError";
    this.code = code;
  }
}
