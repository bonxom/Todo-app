import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { notificationRepository } from "../repositories/notificationRepository.js";
import { generateNotifications } from "../services/notificationGenerationService.js";
import { runNotificationLoop } from "./notificationWorkerLoop.js";
const controller = new AbortController();
const stop = () => controller.abort();
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
try {
  await connectDB();
  await notificationRepository.initIndexes();
  await runNotificationLoop(async () => {
    console.log(await generateNotifications());
  }, controller.signal);
} catch {
  console.error("Notification worker failed to start");
  process.exitCode = 1;
} finally {
  process.removeListener("SIGTERM", stop);
  process.removeListener("SIGINT", stop);
  await mongoose.disconnect();
}
