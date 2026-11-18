import { chatStreamRepository } from "../repositories/chatStreamRepository.js";
import { chatStreamBus } from "./chatStreamBus.js";
import { runConversationTurn } from "./conversationTurnService.js";
import type { ChatTurn } from "../types/IChatTurn.js";
import type { McpContext } from "../mcp/context.js";
import type { AgentInteraction } from "../types/IAgent.js";
import type { ChatEventInput, TurnSnapshot } from "../types/IChatStream.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";

export type TurnExecution = {
  signal: AbortSignal;
  deadlineAt: Date;
  emit(event: ChatEventInput): Promise<void>;
};

interface ActiveRun {
  turnId: string;
  executionToken: string;
  abortController: AbortController;
  timer: NodeJS.Timeout;
  promise: Promise<void>;
}

const activeRuns = new Map<string, ActiveRun>();
let isShuttingDown = false;

export const chatRunService = {
  getActiveRunCount(): number {
    return activeRuns.size;
  },

  hasActiveRun(turnId: string): boolean {
    return activeRuns.has(turnId);
  },

  start(
    turn: ChatTurn,
    context: McpContext,
    selected?: AgentInteraction,
  ): void {
    if (isShuttingDown) {
      throw new AppError(AI_ERROR.CONVERSATION_BUSY);
    }

    if (activeRuns.has(turn._id)) {
      return;
    }

    chatStreamBus.initLiveTurn(turn);

    const abortController = new AbortController();
    const deadlineAt = turn.deadlineAt
      ? new Date(turn.deadlineAt)
      : new Date(Date.now() + 300_000);
    const timeoutMs = Math.max(0, deadlineAt.getTime() - Date.now());

    const timer = setTimeout(() => {
      abortController.abort(new Error("deadline_exceeded"));
    }, timeoutMs);

    const emit = async (event: ChatEventInput): Promise<void> => {
      chatStreamBus.emitLiveEvent(turn._id, event);
    };

    const runPromise = (async () => {
      try {
        await runConversationTurn(turn, context, selected, {
          signal: abortController.signal,
          deadlineAt,
          emit,
        });
      } catch (err: unknown) {
        const isAbort =
          abortController.signal.aborted ||
          (err instanceof Error && err.name === "AbortError");
        const abortReason =
          abortController.signal.reason instanceof Error
            ? abortController.signal.reason.message
            : typeof abortController.signal.reason === "string"
              ? abortController.signal.reason
              : err instanceof Error
                ? err.message
                : "";

        const isDeadline =
          abortReason.includes("deadline") ||
          Date.now() >= deadlineAt.getTime();
        const isShutdown = abortReason.includes("process_shutdown");

        const terminalStatus = isDeadline
          ? "timed_out"
          : isShutdown
            ? "interrupted"
            : isAbort
              ? "cancelled"
              : "failed";

        const terminalReason = isDeadline
          ? "deadline_exceeded"
          : isShutdown
            ? "process_shutdown"
            : isAbort
              ? "user_cancelled"
              : err instanceof Error
                ? err.message
                : "unknown_error";

        const live = chatStreamBus.getLiveSnapshot(turn._id);
        const finalResponse =
          live?.partialResponse || turn.partialResponse || "";

        await chatStreamRepository.finish(turn._id, turn.executionToken, {
          status: terminalStatus,
          terminalReason,
          result: {
            turnId: turn._id,
            conversationId: turn.conversationId,
            status: terminalStatus,
            mode: turn.mode ?? "auto",
            response: finalResponse,
            terminalReason,
          },
        });
      } finally {
        clearTimeout(timer);
        activeRuns.delete(turn._id);
        if (chatStreamBus.hasLiveTurn(turn._id)) {
          chatStreamBus.scheduleCleanup(turn._id, 60_000);
        }
      }
    })();

    // Ensure background rejection does not leak
    runPromise.catch(() => {});

    activeRuns.set(turn._id, {
      turnId: turn._id,
      executionToken: turn.executionToken,
      abortController,
      timer,
      promise: runPromise,
    });
  },

  async cancel(
    userId: string,
    conversationId: string,
    turnId: string,
  ): Promise<TurnSnapshot> {
    if (chatStreamBus.hasLiveTurn(turnId)) {
      chatStreamBus.emitLiveEvent(turnId, {
        type: "turn.stopping",
        payload: { reason: "user" },
      });
    }
    const snapshot = await chatStreamRepository.requestStop(
      userId,
      conversationId,
      turnId,
      "user",
    );
    const active = activeRuns.get(turnId);
    if (active) {
      active.abortController.abort(new Error("user_cancelled"));
    }
    return snapshot;
  },

  async shutdown(timeoutMs = 10_000): Promise<void> {
    isShuttingDown = true;
    const promises: Promise<void>[] = [];
    for (const active of activeRuns.values()) {
      clearTimeout(active.timer);
      active.abortController.abort(new Error("process_shutdown"));
      promises.push(active.promise);
    }
    activeRuns.clear();

    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    });

    const allSettledPromise = Promise.allSettled(promises).then(() => {});

    await Promise.race([allSettledPromise, timeoutPromise]);
    if (timer) {
      clearTimeout(timer);
    }
  },

  _resetForTest(): void {
    isShuttingDown = false;
    activeRuns.clear();
  },
};
