import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chatStreamService } from "../chatStreamService";
import * as authSession from "../authSession";
import { useAuthStore } from "@/stores/useAuthStore";
import { ApiError } from "../apiError";
import type { ChatStreamEvent } from "../../types/chatStream";
import axiosInstance from "../httpClient";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

function createMockStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index++]);
      } else {
        controller.close();
      }
    },
  });
}

describe("chatStreamService", () => {
  const conversationId = "550e8400-e29b-41d4-a716-446655440000";
  const turnId = "550e8400-e29b-41d4-a716-446655440001";
  const encoder = new TextEncoder();

  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().setSession({
      accessToken: "valid-token",
      refreshToken: "valid-refresh",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("decodes multi-byte Vietnamese UTF-8 characters split across chunk boundaries", async () => {
    const text = "Đang xử lý: Thiết lập kế hoạch";
    const eventPayload = {
      version: 1,
      turnId,
      seq: 2,
      occurredAt: new Date().toISOString(),
      payload: { text },
    };
    const sseFrame = `event: assistant.delta\nid: 2\ndata: ${JSON.stringify(eventPayload)}\n\n`;
    const fullBytes = encoder.encode(sseFrame);

    // Split right in the middle of a Vietnamese multibyte char
    // Find index of 'Đ' (starts at 0 in text, but in sseFrame after 'data: ...')
    const splitPoint = Math.floor(fullBytes.length / 2);
    const chunk1 = fullBytes.slice(0, splitPoint);
    const chunk2 = fullBytes.slice(splitPoint);

    const stream = createMockStream([chunk1, chunk2]);
    const mockResponse = new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const events: ChatStreamEvent[] = [];
    await chatStreamService.subscribeTurn({
      conversationId,
      turnId,
      after: 0,
      signal: new AbortController().signal,
      onEvent: (e) => events.push(e),
    });

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("assistant.delta");
    expect(events[0].data.payload.text).toBe(text);
  });

  it("handles multiple events in one chunk and frames split across CRLF", async () => {
    const frame1 = `event: turn.started\r\nid: 1\r\ndata: {"version":1,"turnId":"${turnId}","seq":1,"occurredAt":"2026-11-18T00:00:00Z","payload":{}}\r\n\r\n`;
    const frame2PartA = `event: tool.started\r\nid: 2\r\ndata: {"version":1,"turnId":"${turnId}","seq":2,"occurredAt":"2026-11-18T00:00:00Z","payload":{"label":"Tạo"}`;
    const frame2PartB = `}\r\n\r\n`;

    const stream = createMockStream([
      encoder.encode(frame1 + frame2PartA),
      encoder.encode(frame2PartB),
    ]);

    const mockResponse = new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const events: ChatStreamEvent[] = [];
    await chatStreamService.subscribeTurn({
      conversationId,
      turnId,
      after: 0,
      signal: new AbortController().signal,
      onEvent: (e) => events.push(e),
    });

    expect(events).toHaveLength(2);
    expect(events[0].event).toBe("turn.started");
    expect(events[1].event).toBe("tool.started");
    expect(events[1].data.payload.label).toBe("Tạo");
  });

  it("concatenates multi-line data fields and ignores comments", async () => {
    const frame = `: heartbeat\n: another comment\nevent: assistant.delta\nid: 1\ndata: {\ndata:   "version": 1,\ndata:   "turnId": "${turnId}",\ndata:   "seq": 1,\ndata:   "occurredAt": "2026-11-18T00:00:00Z",\ndata:   "payload": { "msg": "multiline" }\ndata: }\n\n`;

    const stream = createMockStream([encoder.encode(frame)]);
    const mockResponse = new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const events: ChatStreamEvent[] = [];
    await chatStreamService.subscribeTurn({
      conversationId,
      turnId,
      after: 0,
      signal: new AbortController().signal,
      onEvent: (e) => events.push(e),
    });

    expect(events).toHaveLength(1);
    expect(events[0].data.payload.msg).toBe("multiline");
  });

  it("safely ignores malformed JSON or unsupported version without crashing", async () => {
    const malformedFrame = `event: bad\nid: 1\ndata: NOT_JSON\n\n`;
    const wrongVersionFrame = `event: bad_ver\nid: 2\ndata: {"version":99,"turnId":"${turnId}","seq":2,"payload":{}}\n\n`;
    const goodFrame = `event: good\nid: 3\ndata: {"version":1,"turnId":"${turnId}","seq":3,"occurredAt":"2026-11-18T00:00:00Z","payload":{"ok":true}}\n\n`;

    const stream = createMockStream([
      encoder.encode(malformedFrame + wrongVersionFrame + goodFrame),
    ]);
    const mockResponse = new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

    const events: ChatStreamEvent[] = [];
    await chatStreamService.subscribeTurn({
      conversationId,
      turnId,
      after: 0,
      signal: new AbortController().signal,
      onEvent: (e) => events.push(e),
    });

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("good");
  });

  it("throws ApiError when server returns HTTP 400 or non-200 status", async () => {
    const errorResponse = new Response(
      JSON.stringify({ code: "AI_0013", message: "Cursor invalid" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse));

    await expect(
      chatStreamService.subscribeTurn({
        conversationId,
        turnId,
        after: -1,
        signal: new AbortController().signal,
        onEvent: () => {},
      }),
    ).rejects.toThrow(ApiError);
  });

  it("throws ApiError when server returns 200 with incorrect Content-Type", async () => {
    const htmlResponse = new Response("<html>Not SSE</html>", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse));

    await expect(
      chatStreamService.subscribeTurn({
        conversationId,
        turnId,
        after: 0,
        signal: new AbortController().signal,
        onEvent: () => {},
      }),
    ).rejects.toThrow(/Expected text\/event-stream/);
  });

  it("retries opening stream once on 401 using refreshed token", async () => {
    const refreshSpy = vi
      .spyOn(authSession, "refreshAccessToken")
      .mockResolvedValue("new-token-123");

    const goodStream = createMockStream([
      encoder.encode(
        `event: turn.finished\nid: 1\ndata: {"version":1,"turnId":"${turnId}","seq":1,"occurredAt":"2026-11-18T00:00:00Z","payload":{"status":"completed"}}\n\n`,
      ),
    ]);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("Unauthorized", {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(goodStream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const events: ChatStreamEvent[] = [];
    await chatStreamService.subscribeTurn({
      conversationId,
      turnId,
      after: 0,
      signal: new AbortController().signal,
      onEvent: (e) => events.push(e),
    });

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer new-token-123",
    );
    expect(events).toHaveLength(1);
  });

  it("cancels reader and cleanly exits when signal is aborted", async () => {
    const abort = new AbortController();
    let readerCancelled = false;

    const stream = new ReadableStream({
      pull() {
        // Keep stream pending
      },
      cancel() {
        readerCancelled = true;
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      ),
    );

    const subscribePromise = chatStreamService.subscribeTurn({
      conversationId,
      turnId,
      after: 0,
      signal: abort.signal,
      onEvent: () => {},
    });

    abort.abort();
    await subscribePromise;
    expect(readerCancelled).toBe(true);
  });

  it("shares single refresh call when axios request and SSE connect hit 401 concurrently", async () => {
    const rootAxiosMock = new MockAdapter(axios);
    const mock = new MockAdapter(axiosInstance);

    let refreshCalls = 0;
    rootAxiosMock.onPost(new RegExp("/api/auth/refresh")).reply(() => {
      refreshCalls += 1;
      return [
        200,
        { accessToken: "shared-new-token", refreshToken: "rot-ref" },
      ];
    });

    mock.onGet("/api/tasks").replyOnce(401);
    mock.onGet("/api/tasks").reply(200, [{ id: 1 }]);

    const goodStream = createMockStream([
      encoder.encode(
        `event: turn.finished\nid: 1\ndata: {"version":1,"turnId":"${turnId}","seq":1,"occurredAt":"2026-11-18T00:00:00Z","payload":{"status":"completed"}}\n\n`,
      ),
    ]);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(goodStream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const [axiosRes] = await Promise.all([
      axiosInstance.get("/api/tasks"),
      chatStreamService.subscribeTurn({
        conversationId,
        turnId,
        after: 0,
        signal: new AbortController().signal,
        onEvent: () => {},
      }),
    ]);

    expect(axiosRes.data).toEqual([{ id: 1 }]);
    expect(refreshCalls).toBe(1);

    mock.restore();
    rootAxiosMock.restore();
  });
});
