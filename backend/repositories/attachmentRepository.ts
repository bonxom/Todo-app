import type { ClientSession } from "mongoose";
import Attachment from "../models/Attachment.js";
import type { AttachmentView } from "../types/IAttachment.js";
export const attachmentRepository = {
  claimAnalysis: (userId: string, conversationId: string, id: string) =>
    Attachment.findOneAndUpdate(
      {
        _id: id,
        userId,
        conversationId,
        state: "attached",
        analysis: { $exists: false },
      },
      { $set: { analysis: { status: "processing", updatedAt: new Date() } } },
      { new: true },
    ).lean(),
  async finishAnalysis(
    userId: string,
    conversationId: string,
    id: string,
    analysis: {
      status: "succeeded" | "failed";
      description?: string;
      model?: string;
    },
  ) {
    const result = await Attachment.updateOne(
      {
        _id: id,
        userId,
        conversationId,
        state: "attached",
        "analysis.status": "processing",
      },
      { $set: { analysis: { ...analysis, updatedAt: new Date() } } },
    );
    return result.matchedCount === 1;
  },
  create: (
    record: Omit<AttachmentView, "id"> & {
      _id: string;
      userId: string;
      conversationId: string;
      objectKey: string;
    },
  ) => Attachment.create(record),
  async ready(id: string) {
    return (
      (
        await Attachment.updateOne(
          { _id: id, state: "staging" },
          { $set: { state: "uploaded" } },
        )
      ).matchedCount === 1
    );
  },
  get: (userId: string, conversationId: string, id: string) =>
    Attachment.findOne({
      _id: id,
      userId,
      conversationId,
      state: { $in: ["uploaded", "attached"] },
    }).lean(),
  claimUnused: (
    userId: string,
    conversationId: string,
    id: string,
    before?: Date,
  ) =>
    Attachment.findOneAndUpdate(
      {
        _id: id,
        userId,
        conversationId,
        state: { $in: ["staging", "uploaded", "deleting"] },
        ...(before ? { createdAt: { $lt: before } } : {}),
      },
      { $set: { state: "deleting" } },
      { new: true },
    ).lean(),
  delete: (id: string) => Attachment.deleteOne({ _id: id, state: "deleting" }),
  stale: (before: Date) =>
    Attachment.find({
      state: { $in: ["staging", "uploaded", "deleting"] },
      createdAt: { $lt: before },
    })
      .limit(100)
      .lean(),
  async bind(
    userId: string,
    conversationId: string,
    ids: string[],
    session: ClientSession,
  ) {
    const results = [];
    for (const id of ids)
      results.push(
        await Attachment.findOneAndUpdate(
          { _id: id, userId, conversationId, state: "uploaded" },
          { $set: { state: "attached" } },
          { new: true, session },
        ).lean(),
      );
    return results;
  },
};
