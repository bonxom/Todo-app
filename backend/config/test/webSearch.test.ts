import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readWebSearchConfig } from "../webSearch.js";
import { validateServerEnv } from "../env.js";

describe("Web Search Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults to disabled when WEB_SEARCH_ENABLED is not set", () => {
    delete process.env.WEB_SEARCH_ENABLED;
    delete process.env.BRAVE_SEARCH_API_KEY;

    const config = readWebSearchConfig();
    expect(config.enabled).toBe(false);
    expect(config.apiKey).toBeUndefined();
  });

  it("is disabled when WEB_SEARCH_ENABLED is false", () => {
    process.env.WEB_SEARCH_ENABLED = "false";
    delete process.env.BRAVE_SEARCH_API_KEY;

    const config = readWebSearchConfig();
    expect(config.enabled).toBe(false);
  });

  it("returns enabled and apiKey when configured properly", () => {
    process.env.WEB_SEARCH_ENABLED = "true";
    process.env.BRAVE_SEARCH_API_KEY = "test-brave-key-123";

    const config = readWebSearchConfig();
    expect(config.enabled).toBe(true);
    expect(config.apiKey).toBe("test-brave-key-123");
  });

  it("throws descriptive error when enabled but BRAVE_SEARCH_API_KEY is missing", () => {
    process.env.WEB_SEARCH_ENABLED = "true";
    delete process.env.BRAVE_SEARCH_API_KEY;

    expect(() => readWebSearchConfig()).toThrowError(/BRAVE_SEARCH_API_KEY/);
  });

  it("throws descriptive error when enabled but BRAVE_SEARCH_API_KEY is empty/whitespace", () => {
    process.env.WEB_SEARCH_ENABLED = "true";
    process.env.BRAVE_SEARCH_API_KEY = "   ";

    expect(() => readWebSearchConfig()).toThrowError(/BRAVE_SEARCH_API_KEY/);
  });

  it("never includes API key in error message", () => {
    process.env.WEB_SEARCH_ENABLED = "true";
    process.env.BRAVE_SEARCH_API_KEY = "";

    try {
      readWebSearchConfig();
    } catch (err) {
      expect((err as Error).message).not.toContain("test-brave-key");
    }
  });

  it("integrates with validateServerEnv", () => {
    process.env.MONGO_URI = "mongodb://localhost:27017";
    process.env.JWT_SECRET = "secret";
    process.env.JWT_REFRESH_SECRET = "secret-refresh";
    process.env.JWT_ACCESS_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";
    process.env.SALT_ROUNDS = "10";

    // Disabled -> validateServerEnv passes
    process.env.WEB_SEARCH_ENABLED = "false";
    expect(() => validateServerEnv()).not.toThrow();

    // Enabled without key -> validateServerEnv throws
    process.env.WEB_SEARCH_ENABLED = "true";
    delete process.env.BRAVE_SEARCH_API_KEY;
    expect(() => validateServerEnv()).toThrowError(/BRAVE_SEARCH_API_KEY/);
  });
});
