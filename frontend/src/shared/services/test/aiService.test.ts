import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import axiosInstance from "../httpClient";
import { aiService } from "../aiService";
import type { ChatPayload } from "../../types/domain";

describe("aiService.getAgenticChatResponse timezone injection", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axiosInstance);
  });

  afterEach(() => {
    mock.restore();
    vi.unstubAllGlobals();
  });

  it("injects browser timezone into payload", async () => {
    vi.stubGlobal(
      "Intl",
      new Proxy(globalThis.Intl, {
        get: (target, prop) =>
          prop === "DateTimeFormat"
            ? function () {
                return {
                  resolvedOptions() {
                    return { timeZone: "Asia/Tokyo" };
                  },
                };
              }
            : Reflect.get(target, prop),
      }),
    );

    let capturedBody: Record<string, unknown> | undefined;
    mock.onPost("/api/ai/chat-mcp").reply((config) => {
      capturedBody = JSON.parse(config.data as string);
      return [200, { success: true, message: "ok", data: "hello" }];
    });

    const payload: ChatPayload = {
      userInput: "test",
      conversationId: "c1",
      requestId: "r1",
    };
    await aiService.getAgenticChatResponse(payload);

    expect(capturedBody?.timeZone).toBe("Asia/Tokyo");
    // Verify no client-side Date.now or today in payload
    expect(capturedBody).not.toHaveProperty("now");
    expect(capturedBody).not.toHaveProperty("today");
  });

  it("preserves caller-provided timezone override", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    mock.onPost("/api/ai/chat-mcp").reply((config) => {
      capturedBody = JSON.parse(config.data as string);
      return [200, { success: true, message: "ok", data: "hello" }];
    });

    const payload: ChatPayload = {
      userInput: "test",
      conversationId: "c1",
      requestId: "r1",
      timeZone: "Europe/Berlin",
    };
    await aiService.getAgenticChatResponse(payload);

    expect(capturedBody?.timeZone).toBe("Europe/Berlin");
  });

  it("does not crash when Intl is unavailable", async () => {
    vi.stubGlobal("Intl", {
      DateTimeFormat: () => {
        throw new Error("Not supported");
      },
    });

    let capturedBody: Record<string, unknown> | undefined;
    mock.onPost("/api/ai/chat-mcp").reply((config) => {
      capturedBody = JSON.parse(config.data as string);
      return [200, { success: true, message: "ok", data: "hello" }];
    });

    const payload: ChatPayload = {
      userInput: "test",
      conversationId: "c1",
      requestId: "r1",
    };
    await aiService.getAgenticChatResponse(payload);

    // timeZone should be absent, not cause an error
    expect(capturedBody?.timeZone).toBeUndefined();
  });
});
