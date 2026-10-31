import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { readStorageConfig } from "../config/storage.js";
import { attachmentService } from "../services/attachmentService.js";
try {
  if (!readStorageConfig()) throw new Error("Configure MinIO before cleanup");
  await connectDB();
  const result = await attachmentService.cleanup();
  console.log(result);
  if (result.failed) process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
