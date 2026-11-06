import type mongoose from "mongoose";

export interface IUserSkill {
  _id: string; // UUID
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
  version: number;
  sourceTemplateId?: string | null;
  sourceTemplateVersion?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserSkillQuota {
  userId: mongoose.Types.ObjectId;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  version: number;
  updatedAt: string;
  sourceTemplateId?: string;
  sourceTemplateVersion?: string;
}

export interface SkillDetail extends SkillSummary {
  instructions: string;
}

export interface SkillInput {
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
