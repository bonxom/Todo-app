import { describe, expect, it } from "vitest";
import { parseEnv } from "../env";

describe("parseEnv", () => {
  it("normalizes optional URL and debug values", () => {
    expect(parseEnv({ VITE_SERVER_URL: " https://api.example.com ", VITE_API_DEBUG: "true" })).toEqual({
      serverUrl: "https://api.example.com",
      apiDebug: true,
    });
    expect(parseEnv({ VITE_SERVER_URL: "", VITE_API_DEBUG: "false" })).toEqual({
      serverUrl: undefined,
      apiDebug: false,
    });
  });
});
