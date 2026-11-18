import axiosInstance from "./httpClient";
import { env } from "../../config/env";
import { getAccessToken, refreshAccessToken } from "./authSession";
import { ApiError } from "./apiError";
import type { ChatStreamEvent, TurnSnapshot } from "../types/chatStream";
import type { ChatPayload } from "../types/domain";

function parseAndEmitFrame(
  frame: string,
  onEvent: (event: ChatStreamEvent) => void,
): void {
  if (!frame.trim()) return;

  const lines = frame.split(/\r\n|\r|\n/);
  let eventId: string | undefined;
  let eventType = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(":")) {
      // Comment line, ignore (e.g. heartbeat)
      continue;
    }
    if (line.startsWith("id:")) {
      eventId = line.slice(3).trim();
    } else if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return;
  }

  const rawData = dataLines.join("\n");
  try {
    const parsed = JSON.parse(rawData);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.version === 1 &&
      typeof parsed.seq === "number" &&
      typeof parsed.turnId === "string"
    ) {
      onEvent({
        id: eventId ?? String(parsed.seq),
        event: eventType,
        data: parsed,
      });
    }
  } catch {
    // Malformed JSON rejected safely to avoid crashing consumers
  }
}

export const chatStreamService = {
  async startTurn(payload: ChatPayload): Promise<TurnSnapshot> {
    const response = await axiosInstance.post<{ data: TurnSnapshot }>(
      `/api/ai/conversations/${payload.conversationId}/turns`,
      {
        userInput: payload.userInput,
        requestId: payload.requestId,
        mode: payload.mode,
        intent: payload.intent,
        selection: payload.selection,
        attachmentIds: payload.attachmentIds,
        timeZone: payload.timeZone,
      },
    );
    if (!response.data?.data?.turnId) {
      throw new ApiError(
        "Endpoint not found or invalid turn response",
        404,
        "http",
      );
    }
    return response.data.data;
  },

  async getTurn(conversationId: string, turnId: string): Promise<TurnSnapshot> {
    const response = await axiosInstance.get<{ data: TurnSnapshot }>(
      `/api/ai/conversations/${conversationId}/turns/${turnId}`,
    );
    return response.data.data;
  },

  async cancelTurn(
    conversationId: string,
    turnId: string,
  ): Promise<TurnSnapshot> {
    const response = await axiosInstance.post<{ data: TurnSnapshot }>(
      `/api/ai/conversations/${conversationId}/turns/${turnId}/cancel`,
      {},
    );
    return response.data.data;
  },

  async subscribeTurn(options: {
    conversationId: string;
    turnId: string;
    after: number;
    signal: AbortSignal;
    onEvent(event: ChatStreamEvent): void;
  }): Promise<void> {
    const { conversationId, turnId, after, signal, onEvent } = options;

    if (signal.aborted) {
      return;
    }

    const url = `${env.serverUrl || ""}/api/ai/conversations/${conversationId}/turns/${turnId}/events?after=${after}`;
    let token = await getAccessToken();

    const fetchStream = async (authToken: string | null) => {
      return fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        signal,
      });
    };

    let response = await fetchStream(token);

    if (response.status === 401) {
      // Attempt token refresh and retry opening stream once
      token = await refreshAccessToken();
      response = await fetchStream(token);
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        // Non-JSON error body
      }
      throw new ApiError(errorMessage, response.status, "http");
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream")) {
      throw new ApiError(
        `Expected text/event-stream but received ${contentType}`,
        response.status,
        "http",
      );
    }

    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    const onAbort = () => {
      reader.cancel().catch(() => {});
    };
    signal.addEventListener("abort", onAbort, { once: true });

    try {
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        let match: RegExpExecArray | null;
        while ((match = /(?:\r\n\r\n|\n\n|\r\r)/.exec(buffer)) !== null) {
          const frameText = buffer.slice(0, match.index);
          buffer = buffer.slice(match.index + match[0].length);
          parseAndEmitFrame(frameText, onEvent);
        }
      }
    } finally {
      signal.removeEventListener("abort", onAbort);
      try {
        await reader.cancel();
      } catch {
        // Ignore already cancelled errors
      }
      reader.releaseLock();
    }
  },
};
