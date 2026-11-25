import mongoose, { Schema } from "mongoose";
import type { IPushSubscription } from "../types/IPushSubscription.js";

const pushKeysSchema = new Schema(
  {
    p256dh: {
      type: String,
      required: true,
      trim: true,
      maxlength: 512,
    },
    auth: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },
  },
  { _id: false },
);

const pushPrefsSchema = new Schema(
  {
    taskDeadlines: {
      type: Boolean,
      default: true,
    },
    agentReplies: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const pushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    keys: {
      type: pushKeysSchema,
      required: true,
    },
    prefs: {
      type: pushPrefsSchema,
      default: () => ({ taskDeadlines: true, agentReplies: true }),
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

pushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

export default mongoose.model<IPushSubscription>(
  "PushSubscription",
  pushSubscriptionSchema,
);
