import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Types } from "mongoose";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createOrbitMcpServer } from "../server.js";
import * as webSearchService from "../../services/webSearchService.js";
import type { IUserDocument } from "../../types/IUser.js";
import {
  createAgentBudget,
  type AgentBudget,
} from "../../utils/agentBudget.js";

describe("orbit_web_search MCP tool", () => {
  const originalEnv = { ...process.env };
  const mockUser = { _id: new Types.ObjectId(), role: "USER" } as IUserDocument;

  beforeEach(() => {
    vi.unstubAllEnvs();
    process.env.WEB_SEARCH_ENABLED = "true";
    process.env.BRAVE_SEARCH_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  async function createClientServer(options?: { budget?: AgentBudget }) {
    const server = createOrbitMcpServer(
      { user: mockUser, requestId: "test-req" },
      undefined,
      options,
    );
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [s, c] = InMemoryTransport.createLinkedPair();
    await server.connect(s);
    await client.connect(c);
    return { server, client };
  }

  it("does not register orbit_web_search when disabled", async () => {
    process.env.WEB_SEARCH_ENABLED = "false";
    const { client } = await createClientServer();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).not.toContain("orbit_web_search");
  });

  it("registers orbit_web_search when enabled with openWorldHint=true", async () => {
    const { client } = await createClientServer();
    const { tools } = await client.listTools();
    const searchTool = tools.find((t) => t.name === "orbit_web_search");
    expect(searchTool).toBeDefined();
    expect(searchTool?.annotations?.readOnlyHint).toBe(true);
    expect(searchTool?.annotations?.destructiveHint).toBe(false);
    expect(searchTool?.annotations?.openWorldHint).toBe(true);
  });

  it("returns INVALID_ARGUMENT when query is invalid", async () => {
    const { client } = await createClientServer();
    const result = await client.callTool({
      name: "orbit_web_search",
      arguments: { query: "" },
    });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ text: string }>)[0].text;
    expect(text).toMatch(/query/i);
  });

  it("calls searchWeb and caches identical queries in same session", async () => {
    const searchSpy = vi
      .spyOn(webSearchService, "searchWeb")
      .mockResolvedValue({
        query: "React docs",
        searchedAt: "2026-11-12T00:00:00.000Z",
        results: [
          {
            title: "React",
            url: "https://react.dev",
            snippet: "The library for web and native user interfaces",
          },
        ],
      });

    const { client } = await createClientServer();

    // Call 1
    const res1 = await client.callTool({
      name: "orbit_web_search",
      arguments: { query: "React docs" },
    });
    expect(res1.isError).toBeFalsy();
    expect(searchSpy).toHaveBeenCalledTimes(1);

    // Call 2 with same normalized query and default count 5 -> cache hit
    const res2 = await client.callTool({
      name: "orbit_web_search",
      arguments: { query: " React docs ", count: 5 },
    });
    expect(res2.isError).toBeFalsy();
    expect(searchSpy).toHaveBeenCalledTimes(1);

    const data = JSON.parse((res2.content as Array<{ text: string }>)[0].text);
    expect(data.results[0].title).toBe("React");
  });

  it("enforces maximum 2 network calls per session", async () => {
    const searchSpy = vi
      .spyOn(webSearchService, "searchWeb")
      .mockResolvedValue({
        query: "dummy",
        searchedAt: "2026-11-12T00:00:00.000Z",
        results: [],
      });

    const { client } = await createClientServer();

    // Call 1 (slot 1)
    await client.callTool({
      name: "orbit_web_search",
      arguments: { query: "query 1" },
    });
    expect(searchSpy).toHaveBeenCalledTimes(1);

    // Call 2 (slot 2)
    await client.callTool({
      name: "orbit_web_search",
      arguments: { query: "query 2" },
    });
    expect(searchSpy).toHaveBeenCalledTimes(2);

    // Call 3 (exceeds limit)
    const res3 = await client.callTool({
      name: "orbit_web_search",
      arguments: { query: "query 3" },
    });
    expect(res3.isError).toBe(true);
    expect(searchSpy).toHaveBeenCalledTimes(2); // not called again
    const content = JSON.parse(
      (res3.content as Array<{ text: string }>)[0].text,
    );
    expect(content.error.code).toBe("WEB_SEARCH_LIMIT_REACHED");
  });

  it("rejects search when budget is insufficient", async () => {
    const searchSpy = vi.spyOn(webSearchService, "searchWeb");
    const mockBudget = createAgentBudget(() => 0, 10_000); // 10000 - 12000 = -2000 <= 0
    const { client } = await createClientServer({ budget: mockBudget });

    const res = await client.callTool({
      name: "orbit_web_search",
      arguments: { query: "test budget" },
    });

    expect(res.isError).toBe(true);
    expect(searchSpy).not.toHaveBeenCalled();
    const content = JSON.parse(
      (res.content as Array<{ text: string }>)[0].text,
    );
    expect(content.error.code).toBe("WEB_SEARCH_BUDGET_EXCEEDED");
  });
});
