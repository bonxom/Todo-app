import type { ClientSession } from "mongoose";
import Attachment from "../models/Attachment.js";
import type { AttachmentView } from "../types/IAttachment.js";
export const attachmentRepository = {
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
