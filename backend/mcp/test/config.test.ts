import { describe, expect, it } from "vitest";
import { readMcpConfig } from "../config.js";
const enabled = { MCP_ENABLED: "true", HOST: "127.0.0.1", NODE_ENV: "test" };
describe("MCP local configuration", () => {
  it("defaults off and accepts explicit loopback development", () => {
    expect(readMcpConfig({}).enabled).toBe(false);
    expect(readMcpConfig(enabled)).toMatchObject({
      enabled: true,
      port: 3001,
      allowedOrigins: [],
    });
    expect(
      readMcpConfig({
        ...enabled,
        MCP_ALLOWED_ORIGINS: "http://localhost:6274,http://127.0.0.1:6274",
      }).allowedOrigins,
    ).toHaveLength(2);
  });
  it.each([
    { MCP_ENABLED: "yes" },
    { ...enabled, JWT_SECRET: "same", JWT_REFRESH_SECRET: "same" },
    { ...enabled, HOST: "0.0.0.0" },
    { ...enabled, NODE_ENV: undefined },
    { ...enabled, NODE_ENV: "production" },
    { ...enabled, VERCEL: "1" },
    { ...enabled, PORT: "0" },
    { ...enabled, PORT: "3001x" },
    ...[
      "*",
      "null",
      "https://example.com",
      "http://localhost:6274/path",
      "http://u@localhost:6274",
      "http://localhost:6274?x=1",
    ].map((MCP_ALLOWED_ORIGINS) => ({ ...enabled, MCP_ALLOWED_ORIGINS })),
  ])("rejects unsafe configuration %o", (env) =>
    expect(() => readMcpConfig(env)).toThrow(),
  );
});
