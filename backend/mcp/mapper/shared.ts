import { Types } from "mongoose";

export function referenceId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Types.ObjectId) return value.toHexString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value)
    return referenceId(value._id);
  throw new Error("Invalid reference");
}
export function isoDate(value: unknown, optional = false): string | null {
  if (optional && (value === null || value === undefined)) return null;
  if (!(value instanceof Date) || !Number.isFinite(value.getTime()))
    throw new Error("Invalid date");
  return value.toISOString();
}
