import mongoose, { Schema } from "mongoose";
import type { ITaskProposalReceipt } from "../../types/A2UI/ITaskProposal.js";

const taskProposalReceiptSchema = new Schema<ITaskProposalReceipt>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    requestId: { type: String, required: true },
    proposalId: { type: String, required: true },
    payloadFingerprint: { type: String, required: true },
    responseView: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

taskProposalReceiptSchema.index({ userId: 1, requestId: 1 }, { unique: true });

export default mongoose.model<ITaskProposalReceipt>(
  "TaskProposalReceipt",
  taskProposalReceiptSchema,
);
