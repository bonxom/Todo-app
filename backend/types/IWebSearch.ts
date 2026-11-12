export type WebSearchErrorCode =
  | "WEB_SEARCH_DISABLED"
  | "WEB_SEARCH_TIMEOUT"
  | "WEB_SEARCH_RATE_LIMITED"
  | "WEB_SEARCH_UNAVAILABLE"
  | "WEB_SEARCH_LIMIT_REACHED"
  | "WEB_SEARCH_BUDGET_EXCEEDED"
  | "INVALID_ARGUMENT";

export interface WebSearchErrorDetail {
  code: WebSearchErrorCode;
  message: string;
  retryable: boolean;
}

export class WebSearchError extends Error {
  readonly code: WebSearchErrorCode;
  readonly retryable: boolean;

  constructor(code: WebSearchErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "WebSearchError";
    this.code = code;
    this.retryable = retryable;
  }

  toJSON(): { error: WebSearchErrorDetail } {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
      },
    };
  }
}

export interface WebSearchInput {
  query: string;
  count?: number;
}

export interface WebSearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchOutput {
  query: string;
  searchedAt: string;
  results: WebSearchResultItem[];
}
