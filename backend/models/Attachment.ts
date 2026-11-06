import mongoose, { Schema } from "mongoose";
const schema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    conversationId: { type: String, required: true },
    objectKey: { type: String, required: true },
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    analysis: {
      type: new Schema(
        {
          status: {
            type: String,
            enum: ["processing", "succeeded", "failed"],
            required: true,
          },
          description: String,
          model: String,
          updatedAt: Date,
        },
        { _id: false },
      ),
      default: undefined,
    },
    state: {
      type: String,
      enum: ["staging", "uploaded", "attached", "deleting"],
      default: "staging",
      required: true,
    },
  },
  { timestamps: true },
);
schema.index({ state: 1, createdAt: 1 });
schema.index({ userId: 1, conversationId: 1 });
export default mongoose.model("Attachment", schema);
