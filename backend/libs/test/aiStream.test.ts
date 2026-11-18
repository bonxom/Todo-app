import { describe, expect, it, vi } from "vitest";
import type { ChatCompletionChunk } from "openai/resources/chat/completions.js";
import { readAiStream } from "../aiStream.js";
import { AppError } from "../../error/AppError.js";

function providerChunk(
  delta: {
    content?: string | null;
    tool_calls?: Array<{
      index: number;
      id?: string;
      type?: "function";
      function?: { name?: string; arguments?: string };
    }>;
    reasoning?: string;
    reasoning_content?: string;
  },
  finish_reason: "stop" | "tool_calls" | "length" | null = null,
): ChatCompletionChunk {
  return {
    id: "chunk-123",
    object: "chat.completion.chunk",
    created: Date.now(),
    model: "test-model",
    choices: [
      {
        index: 0,
        delta: delta as unknown as ChatCompletionChunk.Choice.Delta,
        finish_reason,
        logprobs: null,
      },
    ],
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("readAiStream", () => {
  it("emits content before the provider completes", async () => {
    const gate = deferred<void>();
    async function* chunks() {
      yield providerChunk({ content: "Xin " });
      await gate.promise;
      yield providerChunk({ content: "chào" }, "stop");
    }

    const onText = vi.fn();
    const reading = readAiStream(chunks(), {
      signal: new AbortController().signal,
      onText,
    });

    await vi.waitFor(() => expect(onText).toHaveBeenCalledWith("Xin "));
    gate.resolve();
    const result = await reading;
    expect(result.content).toBe("Xin chào");
    expect(onText).toHaveBeenCalledTimes(2);
    expect(onText).toHaveBeenLastCalledWith("chào");
  });

  it("assembles fragmented tool calls across chunks by index", async () => {
    async function* chunks() {
      yield providerChunk({
        tool_calls: [
          {
            index: 0,
            id: "call_abc",
            type: "function",
            function: { name: "search", arguments: '{"q":' },
          },
        ],
      });
      yield providerChunk({
        tool_calls: [
          {
            index: 0,
            function: { arguments: '"orbit"}' },
          },
        ],
      });
      yield providerChunk({}, "tool_calls");
    }

    const onText = vi.fn();
    const result = await readAiStream(chunks(), {
      signal: new AbortController().signal,
      onText,
    });

    expect(onText).not.toHaveBeenCalled();
    expect(result.content).toBeNull();
    expect(result.tool_calls).toHaveLength(1);
    expect(result.tool_calls![0]).toEqual({
      id: "call_abc",
      type: "function",
      function: {
        name: "search",
        arguments: '{"q":"orbit"}',
      },
    });
  });

  it("assembles multiple interleaved tool calls", async () => {
    async function* chunks() {
      yield providerChunk({
        tool_calls: [
          {
            index: 0,
            id: "call_0",
            type: "function",
            function: { name: "toolA", arguments: "{" },
          },
          {
            index: 1,
            id: "call_1",
            type: "function",
            function: { name: "toolB", arguments: "{" },
          },
        ],
      });
      yield providerChunk({
        tool_calls: [
          { index: 0, function: { arguments: '"a":1}' } },
          { index: 1, function: { arguments: '"b":2}' } },
        ],
      });
      yield providerChunk({}, "tool_calls");
    }

    const result = await readAiStream(chunks(), {
      signal: new AbortController().signal,
      onText: vi.fn(),
    });

    expect(result.tool_calls).toHaveLength(2);
    const call0 = result.tool_calls![0] as { function: { arguments: string } };
    const call1 = result.tool_calls![1] as { function: { arguments: string } };
    expect(call0.function.arguments).toBe('{"a":1}');
    expect(call1.function.arguments).toBe('{"b":2}');
  });

  it("ignores reasoning fields and only emits delta.content", async () => {
    async function* chunks() {
      yield providerChunk({
        reasoning: "Thinking about response...",
        reasoning_content: "Internal thought",
        content: "Hello",
      });
      yield providerChunk({ content: " world" }, "stop");
    }

    const onText = vi.fn();
    const result = await readAiStream(chunks(), {
      signal: new AbortController().signal,
      onText,
    });

    expect(onText).toHaveBeenCalledTimes(2);
    expect(onText).toHaveBeenCalledWith("Hello");
    expect(onText).toHaveBeenCalledWith(" world");
    expect(result.content).toBe("Hello world");
  });

  it("throws when abort signal is triggered during streaming", async () => {
    const controller = new AbortController();
    async function* chunks() {
      yield providerChunk({ content: "Start" });
      controller.abort();
      yield providerChunk({ content: "End" });
    }

    await expect(
      readAiStream(chunks(), {
        signal: controller.signal,
        onText: vi.fn(),
      }),
    ).rejects.toThrow(AppError);
  });
});
