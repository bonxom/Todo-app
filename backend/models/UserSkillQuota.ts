import mongoose, { Schema } from "mongoose";
import type { IUserSkillQuota } from "../types/IUserSkill.js";

const schema = new Schema<IUserSkillQuota>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    count: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model<IUserSkillQuota>("UserSkillQuota", schema);
