import { readWebSearchConfig } from "../config/webSearch.js";
import {
  WebSearchError,
  type WebSearchInput,
  type WebSearchOutput,
  type WebSearchResultItem,
} from "../types/IWebSearch.js";

const MAX_BODY_BYTES = 1024 * 1024; // 1 MiB

function validateInput(input: unknown): { query: string; count: number } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new WebSearchError(
      "INVALID_ARGUMENT",
      "Search input must be an object",
      false,
    );
  }

  const record = input as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== "query" && key !== "count") {
      throw new WebSearchError(
        "INVALID_ARGUMENT",
        `Unknown field in search input: ${key}`,
        false,
      );
    }
  }

  if (typeof record.query !== "string") {
    throw new WebSearchError(
      "INVALID_ARGUMENT",
      "Query must be a string",
      false,
    );
  }

  const query = record.query.trim();
  if (query.length < 1 || query.length > 400) {
    throw new WebSearchError(
      "INVALID_ARGUMENT",
      "Query must be between 1 and 400 characters",
      false,
    );
  }

  const wordCount = query.split(/\s+/).filter(Boolean).length;
  if (wordCount > 75) {
    throw new WebSearchError(
      "INVALID_ARGUMENT",
      "Query must not exceed 75 whitespace-separated words",
      false,
    );
  }

  let count = 5;
  if (record.count !== undefined) {
    if (
      typeof record.count !== "number" ||
      !Number.isInteger(record.count) ||
      record.count < 1 ||
      record.count > 5
    ) {
      throw new WebSearchError(
        "INVALID_ARGUMENT",
        "Count must be an integer between 1 and 5",
        false,
      );
    }
    count = record.count;
  }

  return { query, count };
}

function stripHtmlTags(str: string): string {
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function readLimitedBody(response: Response): Promise<string> {
  if (response.body && typeof response.body.getReader === "function") {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > MAX_BODY_BYTES) {
            await reader.cancel();
            throw new WebSearchError(
              "WEB_SEARCH_UNAVAILABLE",
              "Response body exceeded 1 MiB limit",
              true,
            );
          }
          accumulated += decoder.decode(value, { stream: true });
        }
      }
      accumulated += decoder.decode();
      return accumulated;
    } catch (err) {
      if (err instanceof WebSearchError) throw err;
      throw new WebSearchError(
        "WEB_SEARCH_UNAVAILABLE",
        "Failed reading search response body",
        true,
      );
    }
  }

  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    throw new WebSearchError(
      "WEB_SEARCH_UNAVAILABLE",
      "Response body exceeded 1 MiB limit",
      true,
    );
  }
  return text;
}

export async function searchWeb(
  input: WebSearchInput,
  options: { timeoutMs: number; fetchImpl?: typeof fetch },
): Promise<WebSearchOutput> {
  const { query, count } = validateInput(input);

  const config = readWebSearchConfig();
  if (!config.enabled) {
    throw new WebSearchError(
      "WEB_SEARCH_DISABLED",
      "Web search is currently disabled",
      false,
    );
  }

  if (!config.apiKey) {
    throw new WebSearchError(
      "WEB_SEARCH_UNAVAILABLE",
      "Web search service is misconfigured",
      true,
    );
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(count));
  url.searchParams.set("result_filter", "web");
  url.searchParams.set("text_decorations", "false");

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, options.timeoutMs);

  const fetchFn = options.fetchImpl ?? fetch;

  try {
    const response = await fetchFn(url, {
      method: "GET",
      headers: {
        "X-Subscription-Token": config.apiKey,
        Accept: "application/json",
      },
      signal: controller.signal,
      redirect: "error",
    });

    if (response.status === 429) {
      throw new WebSearchError(
        "WEB_SEARCH_RATE_LIMITED",
        "Search provider rate limit exceeded",
        true,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new WebSearchError(
        "WEB_SEARCH_UNAVAILABLE",
        "Search provider authorization failure",
        true,
      );
    }

    if (!response.ok) {
      throw new WebSearchError(
        "WEB_SEARCH_UNAVAILABLE",
        `Search provider error (${response.status})`,
        true,
      );
    }

    const rawBody = await readLimitedBody(response);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new WebSearchError(
        "WEB_SEARCH_UNAVAILABLE",
        "Search provider returned invalid JSON",
        true,
      );
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new WebSearchError(
        "WEB_SEARCH_UNAVAILABLE",
        "Search provider returned malformed response envelope",
        true,
      );
    }

    const webObj = (parsed as Record<string, unknown>).web;
    if (webObj === undefined || webObj === null) {
      return {
        query,
        searchedAt: new Date().toISOString(),
        results: [],
      };
    }

    if (typeof webObj !== "object" || Array.isArray(webObj)) {
      throw new WebSearchError(
        "WEB_SEARCH_UNAVAILABLE",
        "Search provider returned malformed web section",
        true,
      );
    }

    const rawResults = (webObj as Record<string, unknown>).results;
    if (rawResults === undefined || rawResults === null) {
      return {
        query,
        searchedAt: new Date().toISOString(),
        results: [],
      };
    }

    if (!Array.isArray(rawResults)) {
      throw new WebSearchError(
        "WEB_SEARCH_UNAVAILABLE",
        "Search provider returned non-array results",
        true,
      );
    }

    const seenUrls = new Set<string>();
    const results: WebSearchResultItem[] = [];

    for (const item of rawResults) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;

      const rawUrl = typeof row.url === "string" ? row.url.trim() : "";
      if (!rawUrl || rawUrl.length > 2048) continue;

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(rawUrl);
      } catch {
        continue;
      }

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        continue;
      }

      if (parsedUrl.username || parsedUrl.password) {
        continue;
      }

      const normalizedUrl = parsedUrl.href;
      if (seenUrls.has(normalizedUrl)) continue;
      seenUrls.add(normalizedUrl);

      const rawTitle = typeof row.title === "string" ? row.title : "";
      const rawSnippet =
        typeof row.description === "string"
          ? row.description
          : typeof row.snippet === "string"
            ? row.snippet
            : "";

      const title = stripHtmlTags(rawTitle).slice(0, 200);
      const snippet = stripHtmlTags(rawSnippet).slice(0, 1000);

      results.push({
        title,
        url: normalizedUrl,
        snippet,
      });

      if (results.length >= count) break;
    }

    return {
      query,
      searchedAt: new Date().toISOString(),
      results,
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new WebSearchError(
        "WEB_SEARCH_TIMEOUT",
        "Search request timed out",
        true,
      );
    }
    if (error instanceof WebSearchError) {
      throw error;
    }
    throw new WebSearchError(
      "WEB_SEARCH_UNAVAILABLE",
      "Search request failed",
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}
