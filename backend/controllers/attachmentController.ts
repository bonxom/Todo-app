import type { Request, Response } from "express";
import { pipeline } from "node:stream/promises";
import { attachmentService } from "../services/attachmentService.js";
import { AppError } from "../error/AppError.js";
import { ATTACHMENT_ERROR } from "../error/definitions/attachmentErrors.js";
export async function uploadAttachment(req: Request, res: Response) {
  if (!req.file) throw new AppError(ATTACHMENT_ERROR.INVALID);
  const data = await attachmentService.upload(
    String(req.user!._id),
    req.validatedParams!.conversationId,
    req.file,
  );
  res.status(201).json({ data });
}
export async function downloadAttachment(req: Request, res: Response) {
  const { metadata, stream } = await attachmentService.download(
    String(req.user!._id),
    req.validatedParams!.conversationId,
    req.validatedParams!.attachmentId,
  );
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "sandbox");
  res.setHeader("Content-Type", metadata.mimeType);
  res.setHeader("Content-Length", metadata.size);
  const filename = encodeURIComponent(metadata.name).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16)}`,
  );
  res.setHeader(
    "Content-Disposition",
    `${metadata.mimeType.startsWith("image/") ? "inline" : "attachment"}; filename="attachment"; filename*=UTF-8''${filename}`,
  );
  await pipeline(stream, res);
}
export async function deleteAttachment(req: Request, res: Response) {
  await attachmentService.removeUnused(
    String(req.user!._id),
    req.validatedParams!.conversationId,
    req.validatedParams!.attachmentId,
  );
  res.sendStatus(204);
}
