import { chatStreamRepository } from "../repositories/chatStreamRepository.js";
import { chatStreamBus } from "./chatStreamBus.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";
import type { ChatStreamEvent } from "../types/IChatStream.js";

export interface StreamEventsOptions {
  userId: string;
  conversationId: string;
  turnId: string;
  after: number;
  signal: AbortSignal;
  write: (frame: string) => boolean;
  drain: () => Promise<void>;
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
  maxBufferBytes?: number;
  getBufferedBytes?: () => number;
}

const TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "cancelled",
  "timed_out",
  "interrupted",
]);

export const chatEventStreamService = {
  async streamEvents(options: StreamEventsOptions): Promise<void> {
    const {
      userId,
      conversationId,
      turnId,
      after,
      signal,
      write,
      drain,
      pollIntervalMs = 500,
      heartbeatIntervalMs = 15_000,
      maxBufferBytes = 256 * 1024,
      getBufferedBytes,
    } = options;

    if (after < 0) {
      throw new AppError(AI_ERROR.CHAT_CURSOR_INVALID);
    }

    const initialSnapshot = await chatStreamRepository.getSnapshot(
      userId,
      conversationId,
      turnId,
    );

    if (
      initialSnapshot.lastEventSeq !== undefined &&
      after > initialSnapshot.lastEventSeq
    ) {
      throw new AppError(AI_ERROR.CHAT_CURSOR_INVALID);
    }

    let currentCursor = after;
    let lastHeartbeatTime = Date.now();

    while (!signal.aborted) {
      if (getBufferedBytes && getBufferedBytes() > maxBufferBytes) {
        // Slow client queue exceeded 256 KiB threshold; disconnect subscriber
        return;
      }

      const events: ChatStreamEvent[] = await chatStreamRepository.readEvents(
        userId,
        conversationId,
        turnId,
        currentCursor,
        100,
      );

      if (events.length > 0) {
        for (const event of events) {
          if (signal.aborted) {
            return;
          }

          const frame = `id: ${event.id}\nevent: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
          if (Buffer.byteLength(frame, "utf8") > maxBufferBytes) {
            return;
          }

          const ok = write(frame);
          currentCursor = event.data.seq;
          lastHeartbeatTime = Date.now();

          if (!ok) {
            await drain();
          }

          if (event.event === "turn.finished") {
            return;
          }
        }
        // Immediately fetch next batch if any
        continue;
      }

      // No events read in this cycle; check if turn already reached terminal state
      const currentSnapshot = await chatStreamRepository.getSnapshot(
        userId,
        conversationId,
        turnId,
      );

      if (
        TERMINAL_STATUSES.has(currentSnapshot.status) &&
        currentCursor >= currentSnapshot.lastEventSeq
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastHeartbeatTime >= heartbeatIntervalMs) {
        const ok = write(": heartbeat\n\n");
        lastHeartbeatTime = Date.now();
        if (!ok) {
          await drain();
        }
      }

      if (signal.aborted) {
        return;
      }

      await chatStreamBus.waitForNext(turnId, pollIntervalMs, signal);
    }
  },
};
