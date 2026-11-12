export interface WebSearchConfig {
  enabled: boolean;
  apiKey?: string;
}

export function readWebSearchConfig(): WebSearchConfig {
  const enabled = process.env.WEB_SEARCH_ENABLED === "true";
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim() || undefined;

  if (enabled && !apiKey) {
    throw new Error(
      "Missing required environment variable for web search: BRAVE_SEARCH_API_KEY",
    );
  }

  return {
    enabled,
    apiKey,
  };
}

export function validateWebSearchConfig(): void {
  readWebSearchConfig();
}
