import mongoose, { Schema } from "mongoose";
import type { IUserSkill } from "../types/IUserSkill.js";

const schema = new Schema<IUserSkill>(
  {
    _id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, maxlength: 80 },
    description: { type: String, required: true, maxlength: 500 },
    instructions: { type: String, required: true, maxlength: 10000 },
    enabled: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    sourceTemplateId: { type: String, default: null },
    sourceTemplateVersion: { type: String, default: null },
  },
  { timestamps: true },
);

schema.index({ userId: 1, updatedAt: -1, _id: 1 });

export default mongoose.model<IUserSkill>("UserSkill", schema);
