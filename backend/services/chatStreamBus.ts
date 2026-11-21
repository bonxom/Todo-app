import { EventEmitter } from "node:events";
import type {
  ChatEventInput,
  ChatStreamEvent,
  ReasoningBlock,
  ToolProgress,
  TurnSnapshot,
  RunStatus,
} from "../types/IChatStream.js";

export interface LiveTurnState {
  turnId: string;
  userId: string;
  conversationId: string;
  requestId?: string;
  status: RunStatus;
  partialResponse: string;
  lastEventSeq: number;
  toolProgress: ToolProgress[];
  reasoningBlocks: ReasoningBlock[];
  deadlineAt: string;
  events: ChatStreamEvent[];
  cleanupTimer?: NodeJS.Timeout;
}

class ChatStreamBus {
  private emitter = new EventEmitter();
  private liveTurns = new Map<string, LiveTurnState>();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  private getChannel(turnId: string): string {
    return `turn:${turnId}`;
  }

  initLiveTurn(turn: {
    _id: string;
    userId: string | unknown;
    conversationId: string;
    requestId?: string;
    deadlineAt?: Date | string;
    lastEventSeq?: number;
    partialResponse?: string;
  }): void {
    const turnId = String(turn._id);
    const deadlineStr = turn.deadlineAt
      ? new Date(turn.deadlineAt).toISOString()
      : new Date(Date.now() + 300_000).toISOString();

    this.liveTurns.set(turnId, {
      turnId,
      userId: String(turn.userId),
      conversationId: turn.conversationId,
      requestId: turn.requestId || "",
      status: "processing",
      partialResponse: turn.partialResponse || "",
      lastEventSeq: turn.lastEventSeq ?? 0,
      toolProgress: [],
      reasoningBlocks: [],
      deadlineAt: deadlineStr,
      events: [],
    });
  }

  hasLiveTurn(turnId: string): boolean {
    return this.liveTurns.has(turnId);
  }

  getLiveTurn(turnId: string): LiveTurnState | null {
    return this.liveTurns.get(turnId) ?? null;
  }

  getLiveSnapshot(turnId: string): TurnSnapshot | null {
    const live = this.liveTurns.get(turnId);
    if (!live) return null;

    return {
      turnId: live.turnId,
      conversationId: live.conversationId,
      requestId: live.requestId || "",
      status: live.status,
      partialResponse: live.partialResponse,
      lastEventSeq: live.lastEventSeq,
      toolProgress: [...live.toolProgress],
      reasoningBlocks: live.reasoningBlocks.map((b) => ({ ...b })),
      deadlineAt: live.deadlineAt,
    };
  }

  getLiveEvents(
    turnId: string,
    after: number,
    limit = 100,
  ): ChatStreamEvent[] | null {
    const live = this.liveTurns.get(turnId);
    if (!live) return null;

    return live.events.filter((e) => e.data.seq > after).slice(0, limit);
  }

  emitLiveEvent(
    turnId: string,
    eventInput: ChatEventInput,
  ): ChatStreamEvent | null {
    const live = this.liveTurns.get(turnId);
    if (!live) return null;

    live.lastEventSeq += 1;
    const seq = live.lastEventSeq;

    if (eventInput.type === "assistant.delta") {
      live.partialResponse += eventInput.payload.text;
    } else if (eventInput.type === "reasoning.delta") {
      const blocks = [...live.reasoningBlocks];
      const idx = blocks.findIndex(
        (b) => b.blockId === eventInput.payload.blockId,
      );
      if (idx >= 0) {
        blocks[idx] = {
          ...blocks[idx],
          text: blocks[idx].text + eventInput.payload.text,
        };
      } else {
        blocks.push({
          blockId: eventInput.payload.blockId,
          text: eventInput.payload.text,
          order: seq,
        });
      }
      live.reasoningBlocks = blocks;
    } else if (eventInput.type === "tool.started") {
      const list = [...live.toolProgress];
      const idx = list.findIndex(
        (t) => t.toolCallId === eventInput.payload.toolCallId,
      );
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          ...(eventInput.payload.toolName
            ? { toolName: eventInput.payload.toolName }
            : {}),
          label: eventInput.payload.label,
          status: "started",
        };
      } else {
        list.push({
          toolCallId: eventInput.payload.toolCallId,
          ...(eventInput.payload.toolName
            ? { toolName: eventInput.payload.toolName }
            : {}),
          label: eventInput.payload.label,
          status: "started",
          order: seq,
        });
      }
      live.toolProgress = list;
    } else if (eventInput.type === "tool.finished") {
      const list = [...live.toolProgress];
      const idx = list.findIndex(
        (t) => t.toolCallId === eventInput.payload.toolCallId,
      );
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          ...(eventInput.payload.toolName
            ? { toolName: eventInput.payload.toolName }
            : {}),
          status: eventInput.payload.status,
          ...(eventInput.payload.summary
            ? { summary: eventInput.payload.summary }
            : {}),
        };
      } else {
        list.push({
          toolCallId: eventInput.payload.toolCallId,
          ...(eventInput.payload.toolName
            ? { toolName: eventInput.payload.toolName }
            : {}),
          label: "Đang xử lý tác vụ",
          status: eventInput.payload.status,
          ...(eventInput.payload.summary
            ? { summary: eventInput.payload.summary }
            : {}),
          order: seq,
        });
      }
      live.toolProgress = list;
    } else if (eventInput.type === "turn.stopping") {
      live.status = "stopping";
    } else if (eventInput.type === "turn.finished") {
      live.status =
        (eventInput.payload as { status?: RunStatus })?.status || "completed";
    }

    const streamEvent: ChatStreamEvent = {
      id: String(seq),
      event: eventInput.type,
      data: {
        version: 1,
        turnId,
        seq,
        occurredAt: new Date().toISOString(),
        payload: eventInput.payload,
      },
    };

    live.events.push(streamEvent);
    this.publish(turnId, streamEvent);

    return streamEvent;
  }

  scheduleCleanup(turnId: string, delayMs = 60_000): void {
    const live = this.liveTurns.get(turnId);
    if (!live) return;
    if (live.cleanupTimer) {
      clearTimeout(live.cleanupTimer);
    }
    live.cleanupTimer = setTimeout(() => {
      this.finishLiveTurn(turnId);
    }, delayMs);
  }

  finishLiveTurn(turnId: string): LiveTurnState | null {
    const live = this.liveTurns.get(turnId);
    if (!live) return null;

    if (live.cleanupTimer) {
      clearTimeout(live.cleanupTimer);
      live.cleanupTimer = undefined;
    }
    this.liveTurns.delete(turnId);
    this.clear(turnId);
    return live;
  }

  publish(turnId: string, event?: ChatStreamEvent): void {
    this.emitter.emit(this.getChannel(turnId), event);
  }

  async waitForNext(
    turnId: string,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<boolean> {
    if (signal?.aborted) {
      return false;
    }

    const channel = this.getChannel(turnId);

    return new Promise<boolean>((resolve) => {
      let timer: NodeJS.Timeout | undefined;

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
        this.emitter.removeListener(channel, onEvent);
        signal?.removeEventListener("abort", onAbort);
      };

      const onEvent = (_event?: ChatStreamEvent) => {
        cleanup();
        resolve(true);
      };

      const onAbort = () => {
        cleanup();
        resolve(false);
      };

      timer = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeoutMs);

      this.emitter.once(channel, onEvent);
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  clear(turnId: string): void {
    this.emitter.removeAllListeners(this.getChannel(turnId));
  }
}

export const chatStreamBus = new ChatStreamBus();
