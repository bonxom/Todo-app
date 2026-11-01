import { extname, posix } from "node:path";
import { AppError } from "../error/AppError.js";
import { ATTACHMENT_ERROR } from "../error/definitions/attachmentErrors.js";
// Strip control characters from untrusted display filenames.
// eslint-disable-next-line no-control-regex
const FILENAME_CONTROLS = /[\x00-\x1f\x7f]/g;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 4;
export type UploadedFile = { originalname: string; buffer: Buffer };

export function decodeFilename(raw: string): string {
  for (let i = 0; i < raw.length; i++) {
    if (raw.charCodeAt(i) > 255) return raw;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.from(raw, "latin1"),
    );
  } catch {
    return raw;
  }
}

export function validateAttachment(file: UploadedFile) {
  const { buffer } = file;
  if (buffer.length > MAX_ATTACHMENT_BYTES)
    throw new AppError(ATTACHMENT_ERROR.TOO_LARGE);
  const decoded = decodeFilename(file.originalname);
  const name = posix
    .basename(decoded.replaceAll("\\", "/"))
    .replace(FILENAME_CONTROLS, "")
    .slice(0, 180);
  const ext = extname(name).toLowerCase();
  let mimeType: string | undefined;
  const start = (hex: string) =>
    buffer.subarray(0, hex.length / 2).equals(Buffer.from(hex, "hex"));
  if ([".jpg", ".jpeg"].includes(ext) && start("ffd8ff"))
    mimeType = "image/jpeg";
  if (ext === ".png" && start("89504e470d0a1a0a")) mimeType = "image/png";
  if (
    ext === ".gif" &&
    /^GIF8[79]a$/.test(buffer.subarray(0, 6).toString("ascii"))
  )
    mimeType = "image/gif";
  if (
    ext === ".webp" &&
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  )
    mimeType = "image/webp";
  if (ext === ".pdf" && buffer.subarray(0, 5).toString() === "%PDF-")
    mimeType = "application/pdf";
  if ([".txt", ".md", ".csv"].includes(ext)) {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      // Permit only printable text, tabs and line endings.
      // eslint-disable-next-line no-control-regex
      if (!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text))
        mimeType =
          ext === ".csv"
            ? "text/csv"
            : ext === ".md"
              ? "text/markdown"
              : "text/plain";
    } catch {
      /* Invalid UTF-8 is not a text attachment. */
    }
  }
  if (!buffer.length || !mimeType || !name)
    throw new AppError(ATTACHMENT_ERROR.INVALID);
  return { name, mimeType, size: buffer.length };
}
