import type mongoose from "mongoose";

export type ProposalIntent = "task_proposal";

export type ProposalStatus = "draft" | "created" | "cancelled";

export interface ProposalItem {
  id: string;
  title: string;
  description?: string;
  priority?: "Low" | "Medium" | "High";
  categoryId?: string;
  projectId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
}

export interface ProposalCreatedTask {
  itemId: string;
  taskId: string;
  title: string;
}

export interface ProposalView {
  id: string;
  conversationId: string;
  turnId: string;
  revision: number;
  status: ProposalStatus;
  protocolVersion: "v0.9";
  catalogId: "urn:orbit:a2ui:task-proposals:v1";
  items: ProposalItem[];
  selectedItemIds: string[];
  createdTasks: ProposalCreatedTask[];
}

export type ProposalAction = {
  requestId: string;
  revision: number;
} & (
  | {
      action: "save" | "confirm";
      items: ProposalItem[];
      selectedItemIds: string[];
    }
  | {
      action: "cancel";
    }
);

export interface ProposalEnvelope {
  proposal: ProposalView;
  text: string;
  a2ui?: {
    protocolVersion: "v0.9";
    catalogId: string;
    surfaceId: string;
    messages: Record<string, unknown>[];
  };
}

export interface ITaskProposal {
  _id?: string;
  userId: mongoose.Types.ObjectId;
  conversationId: string;
  turnId: string;
  proposalId: string;
  revision: number;
  status: ProposalStatus;
  protocolVersion: "v0.9";
  catalogId: "urn:orbit:a2ui:task-proposals:v1";
  items: ProposalItem[];
  selectedItemIds: string[];
  createdTasks: ProposalCreatedTask[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITaskProposalReceipt {
  _id?: string;
  userId: mongoose.Types.ObjectId;
  requestId: string;
  proposalId: string;
  payloadFingerprint: string;
  responseView: ProposalView;
  createdAt?: Date;
  updatedAt?: Date;
}
