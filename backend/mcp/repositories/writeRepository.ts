import mongoose, { Schema } from "mongoose";
import type { TaskDto } from "../schemas.js";

// Existing service/repository operations join Connection.transaction automatically.
mongoose.set("transactionAsyncLocalStorage", true);

interface Receipt {
  _id: string;
  userId: string;
  operation: string;
  fingerprint: string;
  requestId: string;
  taskId: string;
  output: { task: TaskDto };
  createdAt: Date;
}
const receiptSchema = new Schema<Receipt>(
  {
    _id: String,
    userId: { type: String, required: true, index: true },
    operation: { type: String, required: true },
    fingerprint: { type: String, required: true },
    requestId: { type: String, required: true },
    taskId: { type: String, required: true },
    output: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
export const McpWriteReceipt = mongoose.model<Receipt>(
  "McpWriteReceipt",
  receiptSchema,
);
const lockSchema = new Schema(
  { _id: String, revision: { type: Number, default: 0 } },
  { versionKey: false },
);
const McpWriteLock = mongoose.model("McpWriteLock", lockSchema);

export const writeRepository = {
  async transaction<T>(
    userId: string,
    operation: () => Promise<T>,
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
      async () => {
        await McpWriteLock.updateOne(
          { _id: userId },
          { $inc: { revision: 1 } },
        );
        return operation();
      },
      {
        readPreference: "primary",
        writeConcern: { w: "majority" },
        maxCommitTimeMS: 10000,
      },
    );
  },
  findReceipt: (id: string) => McpWriteReceipt.findById(id).lean(),
  saveReceipt: (receipt: Omit<Receipt, "createdAt">) =>
    McpWriteReceipt.create(receipt),
};
