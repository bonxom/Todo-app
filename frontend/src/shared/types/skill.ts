export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  version: number;
  updatedAt: string;
  sourceTemplateId?: string | null;
  sourceTemplateVersion?: string | null;
}

export interface SkillDetail extends SkillSummary {
  instructions: string;
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  version: string;
}

export interface TemplateDetail extends TemplateSummary {
  instructions: string;
}

export interface SkillCreateInput {
  name: string;
  description: string;
  instructions: string;
  enabled?: boolean;
}

export interface SkillUpdateInput {
  expectedVersion: number;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
}

export interface SkillReadRecord {
  id: string;
  name: string;
  version: number;
}
