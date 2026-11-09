import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { notificationRepository } from "../repositories/notificationRepository.js";
import { generateNotifications } from "../services/notificationGenerationService.js";
try {
  await connectDB();
  await notificationRepository.initIndexes();
  console.log(await generateNotifications());
} catch {
  console.error("Notification generation failed");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
