import "dotenv/config";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { getServerConfig, validateServerEnv } from "./config/env.js";
import { readMcpConfig } from "./mcp/config.js";
import { recoverInterruptedRuns } from "./services/chatRunRecoveryService.js";
import { chatRunService } from "./services/chatRunService.js";

readMcpConfig(process.env);
const { host, port } = getServerConfig();

export const instanceId = randomUUID();
let server: Server | null = null;
let isShuttingDown = false;

export async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Received ${signal}, starting graceful shutdown...`);

  if (server) {
    server.close();
  }

  await chatRunService.shutdown(10_000);
}

if (!process.env.VERCEL) {
  const start = async (): Promise<void> => {
    validateServerEnv();
    await connectDB();
    const recovered = await recoverInterruptedRuns(instanceId);
    if (recovered > 0) {
      console.log(`Recovered ${recovered} interrupted chat runs on startup.`);
    }

    server = app.listen(port, host, () => {
      console.log(`Server is running on http://${host}:${port}`);
    });

    const shutdownHandler = (signal: string) => {
      handleShutdown(signal)
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          console.error("Error during graceful shutdown:", error);
          process.exit(1);
        });
    };

    process.once("SIGTERM", () => shutdownHandler("SIGTERM"));
    process.once("SIGINT", () => shutdownHandler("SIGINT"));
  };

  start().catch((error: unknown) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}
