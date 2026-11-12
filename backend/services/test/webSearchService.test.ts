import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { searchWeb } from "../webSearchService.js";
import { WebSearchError } from "../../types/IWebSearch.js";

describe("searchWeb adapter", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.unstubAllEnvs();
    process.env.WEB_SEARCH_ENABLED = "true";
    process.env.BRAVE_SEARCH_API_KEY = "test-brave-api-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("input validation", () => {
    it("rejects empty or whitespace-only query", async () => {
      await expect(
        searchWeb({ query: "" }, { timeoutMs: 5000 }),
      ).rejects.toMatchObject({
        code: "INVALID_ARGUMENT",
      });
      await expect(
        searchWeb({ query: "   " }, { timeoutMs: 5000 }),
      ).rejects.toMatchObject({
        code: "INVALID_ARGUMENT",
      });
    });

    it("rejects query longer than 400 characters", async () => {
      await expect(
        searchWeb({ query: "a".repeat(401) }, { timeoutMs: 5000 }),
      ).rejects.toMatchObject({
        code: "INVALID_ARGUMENT",
      });
    });

    it("rejects query with more than 75 whitespace-separated words", async () => {
      const words = Array.from({ length: 76 }, (_, i) => `word${i}`).join(" ");
      await expect(
        searchWeb({ query: words }, { timeoutMs: 5000 }),
      ).rejects.toMatchObject({
        code: "INVALID_ARGUMENT",
      });
    });

    it("rejects count out of range (not 1..5) or non-integer", async () => {
      await expect(
        searchWeb({ query: "test", count: 0 }, { timeoutMs: 5000 }),
      ).rejects.toMatchObject({
        code: "INVALID_ARGUMENT",
      });
      await expect(
        searchWeb({ query: "test", count: 6 }, { timeoutMs: 5000 }),
      ).rejects.toMatchObject({
        code: "INVALID_ARGUMENT",
      });
      await expect(
        searchWeb({ query: "test", count: 2.5 }, { timeoutMs: 5000 }),
      ).rejects.toMatchObject({
        code: "INVALID_ARGUMENT",
      });
    });

    it("rejects unknown properties in input", async () => {
      await expect(
        searchWeb(
          { query: "test", count: 5, extraField: "forbidden" } as unknown as {
            query: string;
          },
          { timeoutMs: 5000 },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_ARGUMENT",
      });
    });
  });

  describe("feature disabled", () => {
    it("throws WEB_SEARCH_DISABLED when WEB_SEARCH_ENABLED is not true", async () => {
      process.env.WEB_SEARCH_ENABLED = "false";
      await expect(
        searchWeb({ query: "test" }, { timeoutMs: 5000 }),
      ).rejects.toMatchObject({
        code: "WEB_SEARCH_DISABLED",
        retryable: false,
      });
    });
  });

  describe("HTTP request and output mapping", () => {
    it("sends correct endpoint, params, headers and maps output", async () => {
      let capturedUrl: string | undefined;
      let capturedInit: RequestInit | undefined;

      const fetchImpl = vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          capturedUrl = String(input);
          capturedInit = init;
          return new Response(
            JSON.stringify({
              web: {
                results: [
                  {
                    title: "<b>React</b> Documentation",
                    url: "https://react.dev/learn",
                    description:
                      "A JavaScript library for <i>building</i> interfaces.",
                  },
                ],
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        },
      );

      const output = await searchWeb(
        { query: "  react docs  ", count: 3 },
        { timeoutMs: 5000, fetchImpl },
      );

      expect(capturedUrl).toBe(
        "https://api.search.brave.com/res/v1/web/search?q=react+docs&count=3&result_filter=web&text_decorations=false",
      );
      expect(
        (capturedInit?.headers as Record<string, string>)[
          "X-Subscription-Token"
        ],
      ).toBe("test-brave-api-key");
      expect(capturedInit?.redirect).toBe("error");

      expect(output.query).toBe("react docs");
      expect(output.searchedAt).toBeDefined();
      expect(output.results).toEqual([
        {
          title: "React Documentation",
          url: "https://react.dev/learn",
          snippet: "A JavaScript library for building interfaces.",
        },
      ]);
    });

    it("deduplicates results by normalized URL", async () => {
      const fetchImpl = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            web: {
              results: [
                {
                  title: "Doc 1",
                  url: "https://example.com/docs",
                  description: "Desc 1",
                },
                {
                  title: "Doc 1 duplicate",
                  url: "https://example.com/docs",
                  description: "Desc 1 duplicate",
                },
                {
                  title: "Doc 2",
                  url: "https://example.com/other",
                  description: "Desc 2",
                },
              ],
            },
          }),
          { status: 200 },
        );
      });

      const output = await searchWeb(
        { query: "docs" },
        { timeoutMs: 5000, fetchImpl },
      );

      expect(output.results).toHaveLength(2);
      expect(output.results.map((r) => r.url)).toEqual([
        "https://example.com/docs",
        "https://example.com/other",
      ]);
    });

    it("filters out unsafe URLs with credentials or non-http schemes", async () => {
      const fetchImpl = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            web: {
              results: [
                {
                  title: "Dangerous Javascript",
                  url: "javascript:alert(1)",
                  description: "bad",
                },
                {
                  title: "Credentials URL",
                  url: "https://user:password@example.com/secret",
                  description: "bad",
                },
                {
                  title: "Safe URL",
                  url: "https://example.com/safe",
                  description: "good",
                },
              ],
            },
          }),
          { status: 200 },
        );
      });

      const output = await searchWeb(
        { query: "safe query" },
        { timeoutMs: 5000, fetchImpl },
      );

      expect(output.results).toEqual([
        {
          title: "Safe URL",
          url: "https://example.com/safe",
          snippet: "good",
        },
      ]);
    });

    it("handles empty results gracefully", async () => {
      const fetchImpl = vi.fn(async () => {
        return new Response(JSON.stringify({ web: { results: [] } }), {
          status: 200,
        });
      });

      const output = await searchWeb(
        { query: "nonexistent query" },
        { timeoutMs: 5000, fetchImpl },
      );

      expect(output.results).toEqual([]);
    });

    it("handles missing web object gracefully as empty results", async () => {
      const fetchImpl = vi.fn(async () => {
        return new Response(JSON.stringify({ query: {} }), { status: 200 });
      });

      const output = await searchWeb(
        { query: "empty query" },
        { timeoutMs: 5000, fetchImpl },
      );

      expect(output.results).toEqual([]);
    });
  });

  describe("error handling and boundaries", () => {
    it("handles 429 rate limit as WEB_SEARCH_RATE_LIMITED with retryable=true", async () => {
      const fetchImpl = vi.fn(
        async () => new Response("Rate limited", { status: 429 }),
      );

      await expect(
        searchWeb({ query: "rate test" }, { timeoutMs: 5000, fetchImpl }),
      ).rejects.toMatchObject({
        code: "WEB_SEARCH_RATE_LIMITED",
        retryable: true,
      });
    });

    it("handles 401/403/500 as WEB_SEARCH_UNAVAILABLE without leaking key", async () => {
      const fetchImpl = vi.fn(
        async () =>
          new Response("Forbidden with secret key in body", { status: 403 }),
      );

      try {
        await searchWeb({ query: "err test" }, { timeoutMs: 5000, fetchImpl });
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(WebSearchError);
        const searchErr = err as WebSearchError;
        expect(searchErr.code).toBe("WEB_SEARCH_UNAVAILABLE");
        expect(searchErr.message).not.toContain("test-brave-api-key");
        expect(searchErr.message).not.toContain("secret key in body");
      }
    });

    it("handles malformed provider response (results is not an array)", async () => {
      const fetchImpl = vi.fn(
        async () =>
          new Response(JSON.stringify({ web: { results: "not-an-array" } }), {
            status: 200,
          }),
      );

      await expect(
        searchWeb({ query: "malformed" }, { timeoutMs: 5000, fetchImpl }),
      ).rejects.toMatchObject({
        code: "WEB_SEARCH_UNAVAILABLE",
      });
    });

    it("handles non-JSON response body", async () => {
      const fetchImpl = vi.fn(
        async () =>
          new Response("<html>Gateway timeout</html>", { status: 200 }),
      );

      await expect(
        searchWeb({ query: "not json" }, { timeoutMs: 5000, fetchImpl }),
      ).rejects.toMatchObject({
        code: "WEB_SEARCH_UNAVAILABLE",
      });
    });

    it("handles response body exceeding 1 MiB", async () => {
      const bigString = "x".repeat(1024 * 1024 + 50);
      const fetchImpl = vi.fn(
        async () => new Response(bigString, { status: 200 }),
      );

      await expect(
        searchWeb({ query: "big body" }, { timeoutMs: 5000, fetchImpl }),
      ).rejects.toMatchObject({
        code: "WEB_SEARCH_UNAVAILABLE",
      });
    });

    it("reports timeout when headers arrive but the response body stalls", async () => {
      let signal: AbortSignal | null | undefined;
      const fetchImpl = vi.fn(
        async (_url: RequestInfo | URL, init?: RequestInit) => {
          signal = init?.signal;
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode('{"web":'));
                signal?.addEventListener("abort", () => {
                  controller.error(new DOMException("Aborted", "AbortError"));
                });
              },
            }),
          );
        },
      );
      await expect(
        searchWeb({ query: "slow body" }, { timeoutMs: 30, fetchImpl }),
      ).rejects.toMatchObject({ code: "WEB_SEARCH_TIMEOUT", retryable: true });
      expect(signal?.aborted).toBe(true);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it("aborts and throws WEB_SEARCH_TIMEOUT when deadline is reached", async () => {
      const fetchImpl = vi.fn(
        async (_url: RequestInfo | URL, init?: RequestInit) => {
          return new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(
                new DOMException("The operation was aborted.", "AbortError"),
              );
            });
          });
        },
      );

      await expect(
        searchWeb({ query: "slow" }, { timeoutMs: 50, fetchImpl }),
      ).rejects.toMatchObject({
        code: "WEB_SEARCH_TIMEOUT",
        retryable: true,
      });
    });
  });
});
