import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createOrbitMcpServer } from "../server.js";
import { createMcpRouter } from "../router.js";
import User from "../../models/User.js";
import type { McpContext } from "../context.js";
import type { SkillRegistry } from "../../skills/types.js";

const getRegistry = vi.hoisted(() => vi.fn());
vi.mock("../../skills/registry.js", () => ({ getSkillRegistry: getRegistry }));
const document = Object.freeze({
  skillId: "task-management",
  document: "SKILL.md",
  version: "test-version",
  uri: "skill://task-management/SKILL.md",
  text: "# Tasks\nUse idempotencyKey for writes.\n",
});
const registry: SkillRegistry = {
  list: () => [{ id: document.skillId, description: "Tasks", version: document.version }],
  read: () => document,
  documents: () => [document],
};
const user = { _id: new Types.ObjectId(), role: "USER" } as McpContext["user"];
const context: McpContext = { user, requestId: "skill-resource-test" };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  getRegistry.mockReset();
});

async function connect(withRegistry: boolean) {
  const server = createOrbitMcpServer(context, withRegistry ? registry : undefined);
  const client = new Client({ name: "skills-test", version: "1" });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, close: () => Promise.all([client.close(), server.close()]) };
}

describe("skill MCP Resources", () => {
  it("lists and reads exact registry text with version/hash without changing tool schemas", async () => {
    const resourceServer = await connect(true);
    const originalServer = await connect(false);
    try {
      const listed = await resourceServer.client.listResources();
      expect(listed.resources).toEqual([expect.objectContaining({ uri: document.uri, mimeType: "text/markdown" })]);
      const result = await resourceServer.client.readResource({ uri: document.uri });
      expect(result.contents).toEqual([expect.objectContaining({
        uri: document.uri,
        mimeType: "text/markdown",
        text: document.text,
        _meta: {
          "orbit/skillVersion": document.version,
          "orbit/contentHash": createHash("sha256").update(document.text).digest("hex"),
        },
      })]);
      expect(await resourceServer.client.listTools()).toEqual(await originalServer.client.listTools());
      await expect(resourceServer.client.readResource({ uri: "skill://task-management/../../.env" })).rejects.toThrow();
      await expect(resourceServer.client.readResource({ uri: "skill://unknown/SKILL.md" })).rejects.toThrow();
    } finally {
      await Promise.all([resourceServer.close(), originalServer.close()]);
    }
  });

  it("serves resources over the authenticated HTTP boundary and fails closed on registry errors", async () => {
    const secret = "resource-test-access-secret";
    vi.stubEnv("JWT_SECRET", secret);
    vi.spyOn(User, "findById").mockReturnValue({ select: vi.fn().mockResolvedValue(user) } as never);
    getRegistry.mockResolvedValue(registry);
    const app = express();
    app.use("/mcp", createMcpRouter({ enabled: true, host: "127.0.0.1", port: 3001, allowedOrigins: [] }, async () => {}));
    const token = jwt.sign({ id: String(user._id) }, secret, { expiresIn: "5m" });
    const post = (method: string, params?: unknown) => request(app).post("/mcp")
      .set("Host", "127.0.0.1:3001")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json, text/event-stream")
      .send({ jsonrpc: "2.0", id: 1, method, ...(params ? { params } : {}) });
    const listed = await post("resources/list");
    expect(listed.status).toBe(200);
    expect(listed.body.result.resources[0].uri).toBe(document.uri);
    const read = await post("resources/read", { uri: document.uri });
    expect(read.body.result.contents[0].text).toBe(document.text);
    expect((await post("resources/read", { uri: "file:///etc/passwd" })).body.error).toBeDefined();
    const callsBeforeUnauthorized = getRegistry.mock.calls.length;
    const denied = await request(app).post("/mcp").set("Host", "127.0.0.1:3001")
      .set("Accept", "application/json, text/event-stream")
      .send({ jsonrpc: "2.0", id: 1, method: "resources/list" });
    expect(denied.status).toBe(401);
    expect(getRegistry).toHaveBeenCalledTimes(callsBeforeUnauthorized);
    getRegistry.mockRejectedValueOnce(new Error("private registry path"));
    const failed = await post("resources/list");
    expect(failed.status).toBe(500);
    expect(JSON.stringify(failed.body)).not.toContain("private registry path");
  });
});
