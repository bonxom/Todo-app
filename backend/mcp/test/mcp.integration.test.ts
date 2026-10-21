import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createMcpRouter } from "../router.js";
import { protect } from "../../middlewares/auth.js";
import { taskService } from "../../services/taskService.js";
import User from "../../models/User.js";
import Task from "../../models/Task.js";
import Category from "../../models/Category.js";
import Project from "../../models/Project.js";
import {
  taskPageOutputSchema,
  projectPageOutputSchema,
  categoryPageOutputSchema,
  getTaskOutputSchema,
} from "../schemas.js";
const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const dbName = `orbit_mcp_phase2_test_${process.pid}_${Date.now()}`;
const oid = () => new mongoose.Types.ObjectId();
const secret = "disposable-phase2-test-access";
describe.skipIf(!uri)("MCP HTTP + MongoDB integration", () => {
  const ids = {
    a: oid(),
    b: oid(),
    categoryOnly: oid(),
    projectOnly: oid(),
    empty: oid(),
    admin: oid(),
  };
  const ca = oid(),
    cb = oid(),
    cc = oid(),
    pa = oid(),
    pb = oid(),
    pp = oid(),
    dangling = oid();
  const taskIds: Record<string, string> = {};
  let listener: Server, url: string;
  const clients: Client[] = [];
  let beforeSnapshot: unknown;
  async function snapshot() {
    return Promise.all(
      ["tasks", "projects", "categories", "stats", "users"].map(
        async (name) => ({
          name,
          rows: await mongoose.connection
            .collection(name)
            .find()
            .sort({ _id: 1 })
            .toArray(),
        }),
      ),
    );
  }
  async function connect(who: keyof typeof ids, barrier = false) {
    const client = new Client({ name: `test-${who}`, version: "1.0.0" });
    clients.push(client);
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${jwt.sign({ id: String(ids[who]) }, secret, { expiresIn: "5m" })}`,
          ...(barrier ? { "X-Test-Barrier": "yes" } : {}),
        },
      },
    });
    await client.connect(transport);
    expect(transport.protocolVersion).toBe("2025-11-25");
    expect(transport.sessionId).toBeUndefined();
    return client;
  }
  beforeAll(async () => {
    if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(uri))
      throw new Error(
        "Use explicit loopback disposable MongoDB URI ending in /",
      );
    vi.stubEnv("JWT_SECRET", secret);
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
    await User.collection.insertMany(
      Object.entries(ids).map(([name, _id]) => ({
        _id,
        name,
        email: `private-${name}@example.test`,
        role: name === "admin" ? "ADMIN" : "USER",
      })),
    );
    await Category.create([
      { _id: ca, userId: ids.a, name: "A" },
      { _id: cb, userId: ids.b, name: "B" },
      { _id: cc, userId: ids.categoryOnly, name: "C" },
    ]);
    await Project.create([
      { _id: pa, userId: ids.a, name: "A" },
      { _id: pb, userId: ids.b, name: "B" },
      { _id: pp, userId: ids.projectOnly, name: "P" },
    ]);
    const tasks = await Task.create([
      {
        title: "A report",
        categoryId: ca,
        projectId: pa,
        dueDate: new Date("2026-10-16T00:00:00Z"),
      },
      { title: "A standalone", categoryId: ca, description: "a+b" },
      { title: "A project", projectId: pa },
      { title: "B report", categoryId: cb, projectId: pb },
      { title: "Cross owner", categoryId: cb, projectId: pa },
      { title: "Category only", categoryId: cc },
      { title: "Project only", projectId: pp },
      { title: "Orphan" },
      { title: "Dangling", categoryId: dangling, projectId: dangling },
      { title: "Dangling with access", categoryId: dangling, projectId: pa },
    ]);
    tasks.forEach((t) => {
      taskIds[t.title] = String(t._id);
    });
    beforeSnapshot = await snapshot();
    const app = express();
    // Test-only rendezvous after real JWT auth. No service/repository mocks.
    let arrivals = 0;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    app.use("/mcp", (req, res, next) => {
      if (
        req.headers["x-test-barrier"] !== "yes" ||
        req.headers["x-test-call"] !== "yes"
      ) {
        next();
        return;
      }
      void protect(req, res, async () => {
        if (++arrivals === 2) release();
        await gate;
        next();
      }).catch(next);
    });
    const config = {
      enabled: true,
      host: "127.0.0.1",
      port: 1,
      allowedOrigins: [],
    };
    app.use(
      "/mcp",
      createMcpRouter(config, async () => {}),
    );
    listener = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    config.port = (listener.address() as AddressInfo).port;
    url = `http://127.0.0.1:${config.port}/mcp`;
  }, 30000);
  afterAll(async () => {
    try {
      await Promise.allSettled(clients.map((c) => c.close()));
      if (listener)
        await new Promise<void>((resolve, reject) =>
          listener.close((e) => (e ? reject(e) : resolve())),
        );
      if (mongoose.connection.name === dbName && mongoose.connection.db)
        await mongoose.connection.db.dropDatabase();
    } finally {
      await mongoose.disconnect();
      vi.unstubAllEnvs();
    }
  });
  it("P2-03: negotiates protocol, discovers four schemas and calls all tools", async () => {
    const client = await connect("a");
    const tools = (await client.listTools()).tools;
    expect(tools).toHaveLength(5);
    expect(
      tools.every(
        (t) => t.inputSchema && t.outputSchema && t.annotations?.readOnlyHint,
      ),
    ).toBe(true);
    const tasks = taskPageOutputSchema.parse(
      (await client.callTool({ name: "orbit_list_tasks", arguments: {} }))
        .structuredContent,
    );
    expect(tasks.pageInfo.totalCount).toBe(5);
    const task = getTaskOutputSchema.parse(
      (
        await client.callTool({
          name: "orbit_get_task",
          arguments: { taskId: taskIds["A report"] },
        })
      ).structuredContent,
    );
    expect(task.task.title).toBe("A report");
    expect(
      projectPageOutputSchema
        .parse(
          (
            await client.callTool({
              name: "orbit_list_projects",
              arguments: {},
            })
          ).structuredContent,
        )
        .data.map((p) => p.id),
    ).toEqual([String(pa)]);
    expect(
      categoryPageOutputSchema
        .parse(
          (
            await client.callTool({
              name: "orbit_list_categories",
              arguments: {},
            })
          ).structuredContent,
        )
        .data.map((c) => c.id),
    ).toEqual([String(ca)]);
    expect(JSON.stringify(tasks)).not.toContain("private-");
    expect(JSON.stringify(task)).not.toContain("userId");
  });
  it("P2-05: simultaneous authenticated A/B requests keep data and count isolated", async () => {
    const results = await Promise.all(
      (["a", "b"] as const).map((who) =>
        fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwt.sign({ id: String(ids[who]) }, secret, { expiresIn: "5m" })}`,
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            "MCP-Protocol-Version": "2025-11-25",
            "X-Test-Barrier": "yes",
            "X-Test-Call": "yes",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
              name: "orbit_list_tasks",
              arguments: { search: "report" },
            },
          }),
        }).then((r) => r.json()),
      ),
    );
    results.forEach((r, i) => {
      const page = taskPageOutputSchema.parse(r.result.structuredContent);
      expect(page.pageInfo.totalCount).toBe(1);
      expect(page.data.map((t) => t.title)).toEqual([
        i === 0 ? "A report" : "B report",
      ]);
    });
  });
  it("P2-06: get matches list OR access, foreign/orphan/dangling IDs stay hidden", async () => {
    const a = await connect("a");
    for (const title of [
      "A report",
      "A standalone",
      "A project",
      "Cross owner",
      "Dangling with access",
    ]) {
      expect(
        (
          await a.callTool({
            name: "orbit_get_task",
            arguments: { taskId: taskIds[title] },
          })
        ).isError,
      ).not.toBe(true);
    }
    const errors: unknown[] = [];
    for (const taskId of [
      taskIds["B report"],
      taskIds.Orphan,
      taskIds.Dangling,
      String(oid()),
    ]) {
      const result = await a.callTool({
        name: "orbit_get_task",
        arguments: { taskId },
      });
      expect(result.isError).toBe(true);
      errors.push(result.content);
    }
    errors.forEach((e) => expect(e).toEqual(errors[0]));
    const doc = await User.findById(ids.a);
    expect(doc).not.toBeNull();
    await expect(
      taskService.getById(taskIds["Cross owner"], doc!),
    ).rejects.toMatchObject({ statusCode: 403 });
    const admin = await User.findById(ids.admin);
    expect((await taskService.getAll(admin!, {})).pageInfo.totalCount).toBe(10);
  });
  it("P2-06/10: category-only, project-only and empty users stay scoped", async () => {
    for (const [who, title] of [
      ["categoryOnly", "Category only"],
      ["projectOnly", "Project only"],
      ["empty", null],
    ] as const) {
      const client = await connect(who);
      const page = taskPageOutputSchema.parse(
        (await client.callTool({ name: "orbit_list_tasks", arguments: {} }))
          .structuredContent,
      );
      expect(page.data.map((t) => t.title)).toEqual(title ? [title] : []);
      expect(page.pageInfo.totalCount).toBe(title ? 1 : 0);
      if (title)
        expect(
          (
            await client.callTool({
              name: "orbit_get_task",
              arguments: { taskId: taskIds[title] },
            })
          ).isError,
        ).not.toBe(true);
      expect(
        (
          await client.callTool({
            name: "orbit_get_task",
            arguments: { taskId: taskIds["A report"] },
          })
        ).isError,
      ).toBe(true);
    }
    const p = await connect("projectOnly");
    for (const projectId of [String(pb), "standalone"])
      expect(
        taskPageOutputSchema.parse(
          (
            await p.callTool({
              name: "orbit_list_tasks",
              arguments: { projectId },
            })
          ).structuredContent,
        ).pageInfo.totalCount,
      ).toBe(0);
  });
  it("P2-07: combines literal search, date offsets, status, project and paging", async () => {
    const a = await connect("a");
    async function list(args: Record<string, unknown>) {
      return taskPageOutputSchema.parse(
        (await a.callTool({ name: "orbit_list_tasks", arguments: args }))
          .structuredContent,
      );
    }
    expect((await list({ search: " a+b " })).data.map((t) => t.title)).toEqual([
      "A standalone",
    ]);
    expect(
      (
        await list({
          search: "report",
          status: "pending",
          projectId: String(pa),
          startDate: "2026-10-16T07:00:00+07:00",
          endDate: "2026-10-16T00:00:00Z",
        })
      ).data.map((t) => t.title),
    ).toEqual(["A report"]);
    expect(
      (await list({ search: " ", pageNo: 2, pageSize: 1, sort: "title:asc" }))
        .pageInfo,
    ).toEqual({ pageNo: 2, pageSize: 1, totalCount: 5, totalPage: 5 });
    expect((await list({ pageNo: 100 })).data).toEqual([]);
    expect(
      (
        await a.callTool({
          name: "orbit_list_tasks",
          arguments: { userId: String(ids.b) },
        })
      ).isError,
    ).toBe(true);
  });
  it("P2-10: project/category pagination and counts stay user-scoped", async () => {
    for (const who of ["a", "b"] as const) {
      const c = await connect(who);
      for (const name of ["orbit_list_projects", "orbit_list_categories"]) {
        const r = await c.callTool({
          name,
          arguments: { pageNo: 2, pageSize: 1 },
        });
        expect(r.structuredContent).toMatchObject({
          data: [],
          pageInfo: { totalCount: 1, totalPage: 1, pageNo: 2 },
        });
      }
    }
  });
  it("P2-04: admin and deleted user cannot initialize", async () => {
    await expect(connect("admin")).rejects.toThrow();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt.sign({ id: String(oid()) }, secret, { expiresIn: "5m" })}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(response.status).toBe(401);
  });
  it("P2-09/10: repeated stateless calls remain healthy and never mutate data", async () => {
    const client = await connect("a");
    for (let i = 0; i < 20; i++)
      expect(
        (
          await client.callTool({
            name: "orbit_list_tasks",
            arguments: { pageSize: 1 },
          })
        ).isError,
      ).not.toBe(true);
    expect(await snapshot()).toEqual(beforeSnapshot);
  });
});
