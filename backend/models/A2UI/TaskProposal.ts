import mongoose, { Schema } from "mongoose";
import type { ITaskProposal } from "../../types/A2UI/ITaskProposal.js";

const taskProposalSchema = new Schema<ITaskProposal>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    conversationId: { type: String, required: true },
    turnId: { type: String, required: true },
    proposalId: { type: String, required: true },
    revision: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ["draft", "created", "cancelled"],
      required: true,
      default: "draft",
    },
    protocolVersion: { type: String, required: true, default: "v0.9" },
    catalogId: {
      type: String,
      required: true,
      default: "urn:orbit:a2ui:task-proposals:v1",
    },
    items: { type: Schema.Types.Mixed, required: true, default: [] },
    selectedItemIds: { type: [String], required: true, default: [] },
    createdTasks: { type: Schema.Types.Mixed, required: true, default: [] },
  },
  { timestamps: true },
);

taskProposalSchema.index({ userId: 1, turnId: 1 }, { unique: true });
taskProposalSchema.index(
  { userId: 1, conversationId: 1, proposalId: 1 },
  { unique: true },
);

export default mongoose.model<ITaskProposal>(
  "TaskProposal",
  taskProposalSchema,
);
