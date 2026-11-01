import { randomUUID } from "node:crypto";
import type { ClientSession } from "mongoose";
import { attachmentRepository as repository } from "../repositories/attachmentRepository.js";
import { conversationRepository } from "../repositories/conversationRepository.js";
import { objectStorage } from "../libs/objectStorage.js";
import {
  validateAttachment,
  decodeFilename,
  type UploadedFile,
  MAX_ATTACHMENTS,
} from "../utils/attachmentFile.js";
import { AppError } from "../error/AppError.js";
import { ATTACHMENT_ERROR } from "../error/definitions/attachmentErrors.js";
import type { AttachmentView } from "../types/IAttachment.js";
function view(record: {
  _id: string;
  name: string;
  mimeType: string;
  size: number;
}): AttachmentView {
  return {
    id: record._id,
    name: decodeFilename(record.name),
    mimeType: record.mimeType,
    size: record.size,
  };
}
async function removeClaimed(record: { _id: string; objectKey: string }) {
  await objectStorage.remove(record.objectKey);
  await repository.delete(record._id);
}
export const attachmentService = {
  authorizeConversation: (userId: string, conversationId: string) =>
    conversationRepository.get(userId, conversationId),
  async upload(userId: string, conversationId: string, file: UploadedFile) {
    await conversationRepository.get(userId, conversationId);
    const metadata = validateAttachment(file);
    const id = randomUUID();
    const record = await repository.create({
      _id: id,
      userId,
      conversationId,
      objectKey: `${userId}/${conversationId}/${id}`,
      ...metadata,
    });
    try {
      await objectStorage.put(record.objectKey, file.buffer, metadata.mimeType);
      if (!(await repository.ready(id))) throw new Error("Upload expired");
      return view(record);
    } catch {
      // Leave deleting records in place if the store is down; the cleanup job retries.
      try {
        const unused = await repository.claimUnused(userId, conversationId, id);
        if (unused) await removeClaimed(unused);
      } catch {
        /* Retry through the cleanup command. */
      }
      throw new AppError(ATTACHMENT_ERROR.UNAVAILABLE);
    }
  },
  async download(userId: string, conversationId: string, id: string) {
    await conversationRepository.get(userId, conversationId);
    const record = await repository.get(userId, conversationId, id);
    if (!record) throw new AppError(ATTACHMENT_ERROR.NOT_FOUND);
    try {
      return {
        metadata: view(record),
        stream: await objectStorage.get(record.objectKey),
      };
    } catch (error) {
      if (
        ["NoSuchKey", "NoSuchObject"].includes(
          (error as { code?: string }).code ?? "",
        )
      )
        throw new AppError(ATTACHMENT_ERROR.NOT_FOUND);
      throw new AppError(ATTACHMENT_ERROR.UNAVAILABLE);
    }
  },
  async removeUnused(userId: string, conversationId: string, id: string) {
    await conversationRepository.get(userId, conversationId);
    const record = await repository.claimUnused(userId, conversationId, id);
    if (!record) throw new AppError(ATTACHMENT_ERROR.NOT_FOUND);
    try {
      await removeClaimed(record);
    } catch {
      throw new AppError(ATTACHMENT_ERROR.UNAVAILABLE);
    }
  },
  async bind(
    userId: string,
    conversationId: string,
    ids: string[],
    session: ClientSession,
  ) {
    if (ids.length > MAX_ATTACHMENTS || new Set(ids).size !== ids.length)
      throw new AppError(ATTACHMENT_ERROR.INVALID);
    if (!ids.length) return [];
    const records = await repository.bind(userId, conversationId, ids, session);
    return records.map((record) => {
      if (!record) throw new AppError(ATTACHMENT_ERROR.NOT_FOUND);
      return view(record);
    });
  },
  async cleanup() {
    const before = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let removed = 0;
    let failed = 0;
    for (const item of await repository.stale(before)) {
      const record = await repository.claimUnused(
        String(item.userId),
        item.conversationId,
        item._id,
        before,
      );
      if (!record) continue;
      try {
        await removeClaimed(record);
        removed++;
      } catch {
        failed++;
      }
    }
    return { removed, failed };
  },
};
