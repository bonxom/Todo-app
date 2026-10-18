import express from "express";
import { request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { taskService } from "../../services/taskService.js";
import request from "supertest";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import User from "../../models/User.js";
import { createMcpRouter } from "../router.js";
import { readMcpConfig } from "../config.js";
const secret = "mcp-test-access-secret",
  id = String(new Types.ObjectId());
const config = {
  enabled: true,
  host: "127.0.0.1",
  port: 3001,
  allowedOrigins: ["http://localhost:6274"],
};
const token = () => jwt.sign({ id }, secret, { expiresIn: "5m" });
const init = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "test", version: "1" },
  },
};
function setup(ready = vi.fn(async () => {})) {
  const app = express();
  app.use("/mcp", createMcpRouter(config, ready));
  return { app, ready };
}
function post(app: express.Express, auth = token()) {
  return request(app)
    .post("/mcp")
    .set("Host", "127.0.0.1:3001")
    .set("Authorization", `Bearer ${auth}`)
    .set("Accept", "application/json, text/event-stream");
}
beforeEach(() => {
  vi.stubEnv("JWT_SECRET", secret);
  vi.spyOn(User, "findById").mockReturnValue({
    select: vi
      .fn()
      .mockResolvedValue({ _id: new Types.ObjectId(id), role: "USER" }),
  } as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe("MCP HTTP boundary", () => {
  it("handshakes stateless JSON and handles CORS preflight", async () => {
    const { app } = setup();
    const res = await post(app).send(init);
    expect(res.status).toBe(200);
    expect(res.body.result.protocolVersion).toBe("2025-11-25");
    expect(res.headers["mcp-session-id"]).toBeUndefined();
    expect(res.headers["cache-control"]).toBe("no-store");
    const pre = await request(app)
      .options("/mcp")
      .set("Host", "localhost:3001")
      .set("Origin", "http://localhost:6274");
    expect(pre.status).toBe(204);
    expect(pre.headers["access-control-allow-headers"]).toContain(
      "MCP-Protocol-Version",
    );
    expect(
      (await post(app).set("Origin", "http://localhost:6274").send(init))
        .headers["access-control-allow-origin"],
    ).toBe("http://localhost:6274");
  });
  it.each([
    ["Origin", "https://evil.test"],
    ["Origin", "null"],
    ["Host", "evil.test:3001"],
    ["Host", "localhost:9999"],
    ["X-Forwarded-For", "127.0.0.1"],
    ["Forwarded", "for=127.0.0.1"],
  ])("blocks %s=%s before readiness", async (header, value) => {
    const { app, ready } = setup();
    expect((await post(app).set(header, value).send(init)).status).toBe(403);
    expect(ready).not.toHaveBeenCalled();
  });
  it.each([
    "missing",
    "bad",
    "expired",
    "refresh",
    "no-exp",
    "bad-id",
    "deleted",
    "admin",
  ])("blocks %s credentials", async (kind) => {
    const { app } = setup();
    let auth = token();
    if (kind === "bad") auth = "bad";
    if (kind === "expired") auth = jwt.sign({ id }, secret, { expiresIn: -1 });
    if (kind === "refresh")
      auth = jwt.sign({ id }, "different-refresh-secret", { expiresIn: "5m" });
    if (kind === "no-exp") auth = jwt.sign({ id }, secret);
    if (kind === "bad-id")
      auth = jwt.sign({ id: "bad" }, secret, { expiresIn: "5m" });
    if (kind === "deleted" || kind === "admin")
      vi.mocked(User.findById).mockReturnValue({
        select: vi
          .fn()
          .mockResolvedValue(
            kind === "deleted" ? null : { _id: id, role: "ADMIN" },
          ),
      } as never);
    const req = post(app, auth);
    if (kind === "missing") req.unset("Authorization");
    const res = await req.send(init);
    expect(res.status).toBe(kind === "admin" ? 403 : 401);
    if (res.status === 401)
      expect(res.headers["www-authenticate"]).toBe("Bearer");
    expect(JSON.stringify(res.body)).not.toContain(secret);
  });
  it.each(["get", "delete", "head", "put"] as const)(
    "returns405 for %s after auth",
    async (method) => {
      const { app } = setup();
      const res = await request(app)
        [method]("/mcp")
        .set("Host", "localhost:3001")
        .set("Authorization", `Bearer ${token()}`);
      expect(res.status).toBe(405);
      expect(res.headers.allow).toBe("POST, OPTIONS");
    },
  );
  it("rejects malformed JSON, oversized bodies, unsupported version/media and accepts notification", async () => {
    const { app } = setup();
    expect(
      (await post(app).set("Content-Type", "application/json").send("{"))
        .status,
    ).toBe(400);
    expect((await post(app).send({ x: "x".repeat(103000) })).status).toBe(413);
    expect(
      (
        await post(app)
          .set("MCP-Protocol-Version", "unsupported")
          .send({ jsonrpc: "2.0", id: 2, method: "tools/list" })
      ).status,
    ).toBe(400);
    expect(
      (await post(app).set("Content-Type", "text/plain").send("hello")).status,
    ).toBe(415);
    expect(
      (await post(app).set("Accept", "text/plain").send(init)).status,
    ).toBe(406);
    expect(
      (
        await post(app).send({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        })
      ).status,
    ).toBe(202);
  });
  it("sanitizes readiness failure", async () => {
    const { app } = setup(
      vi.fn(async () => {
        throw new Error("mongodb://secret");
      }),
    );
    const res = await post(app).send(init);
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });
  it("disabled route returns404 without DB or auth", async () => {
    const ready = vi.fn();
    const app = express();
    app.use("/mcp", createMcpRouter(readMcpConfig({}), ready));
    expect((await request(app).post("/mcp").send(init)).status).toBe(404);
    expect(ready).not.toHaveBeenCalled();
  });
});

it("cleans up once on success, tool failure and client disconnect", async () => {
  const close = vi.spyOn(McpServer.prototype, "close");
  const { app } = setup();
  await post(app).send(init);
  await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  vi.spyOn(taskService, "getAll").mockRejectedValueOnce(new Error("private"));
  const call = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "orbit_list_tasks", arguments: {} },
  };
  expect((await post(app).send(call)).body.result.isError).toBe(true);
  await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(2));
  let entered: () => void = () => {},
    release: () => void = () => {};
  const started = new Promise<void>((r) => {
    entered = r;
  });
  const gate = new Promise<void>((r) => {
    release = r;
  });
  vi.mocked(taskService.getAll).mockImplementationOnce(async () => {
    entered();
    await gate;
    return {
      data: [],
      pageInfo: { pageNo: 1, pageSize: 20, totalCount: 0, totalPage: 0 },
    };
  });
  const listener = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => listener.once("listening", r));
  try {
    const req = httpRequest({
      host: "127.0.0.1",
      port: (listener.address() as AddressInfo).port,
      path: "/mcp",
      method: "POST",
      headers: {
        Host: "127.0.0.1:3001",
        Authorization: `Bearer ${token()}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
    });
    req.on("error", () => {});
    req.end(JSON.stringify(call));
    await started;
    req.destroy();
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(3));
    release();
    expect((await post(app).send(init)).status).toBe(200);
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(4));
  } finally {
    release();
    await new Promise<void>((r) => listener.close(() => r()));
  }
});

it("rejects non-loopback sockets and expiry on the next request", async () => {
  const remote = express();
  const ready = vi.fn(async () => {});
  remote.use((req, _res, next) => {
    Object.defineProperty(req.socket, "remoteAddress", {
      value: "203.0.113.1",
    });
    next();
  });
  remote.use("/mcp", createMcpRouter(config, ready));
  expect((await post(remote).send(init)).status).toBe(403);
  expect(ready).not.toHaveBeenCalled();
  const { app } = setup();
  const accessToken = token();
  expect((await post(app, accessToken).send(init)).status).toBe(200);
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 600000);
  expect(
    (
      await post(app, accessToken).send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      })
    ).status,
  ).toBe(401);
});
