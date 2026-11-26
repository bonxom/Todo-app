import mongoose, { Schema } from "mongoose";
import type {
  TaskCommandOutput,
  UiCommandOrigin,
} from "../types/ITaskCommand.js";

// Existing service/repository operations join Connection.transaction automatically.
mongoose.set("transactionAsyncLocalStorage", true);

export interface TaskCommandReceipt {
  _id: string;
  userId: string;
  operation: string;
  fingerprint: string;
  requestId: string;
  taskId: string;
  output: TaskCommandOutput;
  origin?: UiCommandOrigin;
  createdAt: Date;
}

const originSchema = new Schema<UiCommandOrigin>(
  {
    channel: { type: String, enum: ["a2ui"], required: true },
    conversationId: { type: String, required: true },
    turnId: { type: String, required: true },
    surfaceId: { type: String, required: true },
    actionId: { type: String, required: true },
  },
  { _id: false },
);

const receiptSchema = new Schema<TaskCommandReceipt>(
  {
    _id: String,
    userId: { type: String, required: true, index: true },
    operation: { type: String, required: true },
    fingerprint: { type: String, required: true },
    requestId: { type: String, required: true },
    taskId: { type: String, required: true },
    output: { type: Schema.Types.Mixed, required: true },
    origin: { type: originSchema, required: false },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

receiptSchema.index({
  userId: 1,
  "origin.channel": 1,
  "origin.conversationId": 1,
  createdAt: -1,
  _id: -1,
});

export const McpWriteReceipt = mongoose.model<TaskCommandReceipt>(
  "McpWriteReceipt",
  receiptSchema,
);

const lockSchema = new Schema(
  { _id: String, revision: { type: Number, default: 0 } },
  { versionKey: false },
);

const McpWriteLock = mongoose.model("McpWriteLock", lockSchema);

export const taskCommandRepository = {
  async transaction<T>(
    userId: string,
    operation: (session: mongoose.ClientSession) => Promise<T>,
  ): Promise<T> {
    // Provision outside the transaction; the unique _id handles concurrent first use.
    try {
      await McpWriteLock.updateOne(
        { _id: userId },
        { $setOnInsert: { revision: 0 } },
        { upsert: true },
      );
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    return mongoose.connection.transaction(
      async (session) => {
        await McpWriteLock.updateOne(
          { _id: userId },
          { $inc: { revision: 1 } },
        );
        return operation(session);
      },
      {
        readPreference: "primary",
        writeConcern: { w: "majority" },
        maxCommitTimeMS: 10000,
      },
    );
  },

  findReceipt: (id: string) => McpWriteReceipt.findById(id).lean().exec(),

  saveReceipt: (receipt: Omit<TaskCommandReceipt, "createdAt">) =>
    McpWriteReceipt.create(receipt),

  findRecentByUiOrigin: (userId: string, conversationId: string, limit = 3) =>
    McpWriteReceipt.find({
      userId,
      "origin.channel": "a2ui",
      "origin.conversationId": conversationId,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean()
      .exec(),
};
