import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from "vitest";
const completion = vi.hoisted(() => vi.fn());
vi.mock("../../libs/aiClient.js", () => ({ getAiClient: () => ({ chat: { completions: { create: completion } } }) }));
vi.mock("../../config/env.js", () => ({ getAiModel: () => "test-model" }));
import aiRoutes from "../../routes/aiRoutes.js";
import { errorHandler } from "../../error/errorHandler.js";
import { requestContext } from "../../error/requestContext.js";
import User from "../../models/User.js";
import Category from "../../models/Category.js";
import Task from "../../models/Task.js";
import Stat from "../../models/Stat.js";
import Conversation from "../../models/Conversation.js";
import ChatTurn from "../../models/ChatTurn.js";
import { McpWriteReceipt, writeRepository } from "../../mcp/repositories/writeRepository.js";
import { conversationRepository } from "../../repositories/conversationRepository.js";

const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const users = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const secret = "conversation-test-only";
const app = express();
app.use(requestContext); app.use(express.json()); app.use("/api/ai", aiRoutes); app.use(errorHandler);
const token = (index = 0) => `Bearer ${jwt.sign({ id: String(users[index]) }, secret, { expiresIn: "1h" })}`;
const post = (path: string, body: object, user = 0) => request(app).post(`/api/ai/${path}`).set("Authorization", token(user)).send(body);
const get = (path: string, user = 0) => request(app).get(`/api/ai/${path}`).set("Authorization", token(user));
const answer = (content: string) => ({ choices: [{ message: { role: "assistant", content } }] });
const tool = (name: string, args: object) => ({ choices: [{ message: { role: "assistant", content: null,
  tool_calls: [{ id: randomUUID(), type: "function", function: { name, arguments: JSON.stringify(args) } }],
} }] });
async function create() {
  const id = randomUUID();
  expect((await post("conversations", { conversationId: id })).status).toBe(201);
  return id;
}

describe.skipIf(!uri)("persistent conversations HTTP + MCP + MongoDB", () => {
  beforeAll(async () => {
    if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(uri)) throw new Error("Use disposable loopback MongoDB");
    vi.stubEnv("JWT_SECRET", secret);
    await mongoose.connect(uri, { dbName: `orbit_memory_test_${process.pid}_${Date.now()}` });
    await User.collection.insertMany(users.map((_id, index) => ({ _id, role: "USER", name: `user-${index}`, email: `memory-${index}@example.test` })));
    await Category.create(users.map((userId) => ({ userId, name: "Uncategorized" })));
    await Conversation.init(); await ChatTurn.init(); await Task.init(); await Stat.init(); await McpWriteReceipt.init();
  });
  afterEach(() => { completion.mockReset(); vi.restoreAllMocks(); });
  afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); vi.unstubAllEnvs(); });

  it("remembers actual tool IDs in the next turn and restores visible history", async () => {
    const conversationId = await create();
    completion.mockResolvedValueOnce(tool("orbit_create_task", { title: "Read book", idempotencyKey: randomUUID() }))
      .mockResolvedValueOnce(answer("Created your reading task."));
    const first = { conversationId, requestId: randomUUID(), userInput: "Create reading task" };
    expect((await post("chat-mcp", first)).body.data).toBe("Created your reading task.");
    const task = await Task.findOne({ title: "Read book" });
    expect(task?.status).toBe("pending");
    completion.mockImplementationOnce(async ({ messages }) => {
      expect(messages).toEqual(expect.arrayContaining([{ role: "user", content: first.userInput }]));
      const result = messages.find((m: { role: string }) => m.role === "tool");
      const rememberedId = JSON.parse(result.content).structuredContent.task.id;
      expect(rememberedId).toBe(String(task!._id));
      return tool("orbit_update_task", { taskId: rememberedId, idempotencyKey: randomUUID(), changes: { status: "in-progress" } });
    }).mockResolvedValueOnce(tool("orbit_update_task", { taskId: String(task!._id), idempotencyKey: randomUUID(), changes: { status: "completed" } })).mockResolvedValueOnce(answer("Marked it complete."));
    const second = await post("chat-mcp", { conversationId, requestId: randomUUID(), userInput: "Complete it" });
    expect(second.status).toBe(200);
    expect(second.body.status).toBe("completed");
    expect((await Task.findById(task!._id))?.status).toBe("completed");
    const restored = await get(`conversations/${conversationId}`);
    expect(restored.headers["cache-control"]).toBe("no-store");
    const history = restored.body.data;
    expect(history.messages.map((m: { text: string }) => m.text)).toEqual([
      "Create reading task", "Created your reading task.", "Complete it", "Marked it complete.",
    ]);
    expect(JSON.stringify(history)).not.toContain("tool_calls");
    expect((await get("conversations/latest")).body.data.conversationId).toBe(conversationId);
  });

  it("deduplicates concurrent requests and completed retries without rerunning tools", async () => {
    const conversationId = await create();
    let release!: (value: unknown) => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    completion.mockImplementationOnce(() => { entered(); return new Promise((resolve) => { release = resolve; }); })
      .mockResolvedValueOnce(answer("Created once."));
    const payload = { conversationId, requestId: randomUUID(), userInput: "Create unique" };
    const first = post("chat-mcp", payload).then((response) => response);
    await started;
    expect((await post("chat-mcp", payload)).status).toBe(409);
    expect((await post("chat-mcp", { ...payload, requestId: randomUUID() })).status).toBe(409);
    release(tool("orbit_create_task", { title: "Unique", idempotencyKey: randomUUID() }));
    const result = await first;
    expect(result.body.status).toBe("completed");
    expect((await post("chat-mcp", payload)).body).toEqual(result.body);
    expect(completion).toHaveBeenCalledTimes(2);
    expect(await Task.countDocuments({ title: "Unique" })).toBe(1);
    expect(await ChatTurn.countDocuments({ conversationId })).toBe(1);
    expect((await post("chat-mcp", { ...payload, userInput: "Different" })).status).toBe(409);
  });

  it("rejects cross-user reads, writes and conversation ID reuse", async () => {
    const conversationId = await create();
    expect((await get(`conversations/${conversationId}`, 1)).status).toBe(404);
    expect((await post("conversations", { conversationId }, 1)).status).toBe(404);
    expect((await post("chat-mcp", { conversationId, requestId: randomUUID(), userInput: "Read secrets" }, 1)).status).toBe(404);
    expect((await get("conversations/latest", 1)).body.data).toBeNull();
    expect(completion).not.toHaveBeenCalled();
    expect((await request(app).get("/api/ai/conversations/latest")).status).toBe(401);
  });

  it("retains committed tool results after provider failure and never reruns a failed turn", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const conversationId = await create();
    completion.mockResolvedValueOnce(tool("orbit_create_task", { title: "Survives failure", idempotencyKey: randomUUID() }))
      .mockRejectedValueOnce(new Error("provider down"));
    const payload = { conversationId, requestId: randomUUID(), userInput: "Create task" };
    const result = await post("chat-mcp", payload);
    expect(result.body.status).toBe("failed");
    await post("chat-mcp", payload);
    expect(completion).toHaveBeenCalledTimes(2);
    expect(await Task.countDocuments({ title: "Survives failure" })).toBe(1);
    const turn = await ChatTurn.findOne({ conversationId });
    expect(turn?.messages.some((m) => m.role === "tool")).toBe(true);
    expect((await get(`conversations/${conversationId}`)).body.data.messages).toHaveLength(2);
  });

  it("never restarts an expired claim and repairs unfinished tool context", async () => {
    const conversationId = await create();
    const requestId = randomUUID();
    const { turn } = await conversationRepository.claim(String(users[0]), conversationId, requestId, "Interrupted");
    await conversationRepository.checkpoint(turn._id, [
      { role: "user", content: "Interrupted" },
      { role: "assistant", content: null, tool_calls: [{ id: "uncertain", type: "function", function: { name: "orbit_create_task", arguments: "{}" } }] },
    ]);
    await ChatTurn.updateOne({ _id: turn._id }, { expiresAt: new Date(0) });
    await Conversation.updateOne({ _id: conversationId }, { busyUntil: new Date(0) });
    expect((await post("chat-mcp", { conversationId, requestId, userInput: "Interrupted" })).body.status).toBe("failed");
    expect(completion).not.toHaveBeenCalled();
    completion.mockImplementationOnce(async ({ messages }) => {
      expect(messages).toEqual(expect.arrayContaining([expect.objectContaining({ role: "tool", tool_call_id: "uncertain", content: expect.stringContaining("outcome unknown") })]));
      return answer("I will check first.");
    });
    expect((await post("chat-mcp", { conversationId, requestId: randomUUID(), userInput: "What happened?" })).body.data).toBe("I will check first.");
  });

  it("paginates saved messages and starts a fresh conversation without old context", async () => {
    const conversationId = await create();
    await ChatTurn.insertMany(Array.from({ length: 55 }, (_, index) => ({
      _id: randomUUID(), userId: users[0], conversationId, requestId: randomUUID(), sequence: index + 1,
      userInput: `message-${index + 1}`, status: "completed", response: "ok", expiresAt: new Date(),
    })));
    const latest = (await get(`conversations/${conversationId}`)).body.data;
    expect(latest.messages).toHaveLength(100);
    expect(latest.before).toBe(6);
    const earlier = (await get(`conversations/${conversationId}?before=6`)).body.data;
    expect(earlier.messages).toHaveLength(10);
    expect(earlier.before).toBeNull();
    const fresh = await create();
    completion.mockImplementationOnce(async ({ messages }) => {
      expect(messages).toHaveLength(2);
      return answer("Fresh start");
    });
    await post("chat-mcp", { conversationId: fresh, requestId: randomUUID(), userInput: "Hello" });
    expect((await get("conversations/latest")).body.data.conversationId).toBe(fresh);
  });

  it("Ask persists approval without writing and resumes exactly once after confirmation", async () => {
    const conversationId = await create();
    const payload = { conversationId, requestId: randomUUID(), userInput: "Create an Ask task", mode: "ask" };
    completion.mockResolvedValueOnce(tool("orbit_create_task", { title: "Ask approved", idempotencyKey: randomUUID() }));
    const paused = await post("chat-mcp", payload);
    expect(paused.status).toBe(200);
    expect(paused.body.status).toBe("awaiting_user");
    expect(paused.body.interaction.kind).toBe("confirmation");
    expect(JSON.stringify(paused.body)).not.toContain("idempotencyKey");
    expect(await Task.countDocuments({ title: "Ask approved" })).toBe(0);
    expect(completion).toHaveBeenCalledTimes(1);
    expect((await post("chat-mcp", payload)).body).toEqual(paused.body);
    expect((await post("chat-mcp", { ...payload, mode: "auto" })).status).toBe(409);
    const oldTurn = await ChatTurn.findOne({ conversationId });
    // Waiting is independent of a worker's expired processing lease.
    await ChatTurn.updateOne({ conversationId }, { expiresAt: new Date(0) });
    const restored = (await get(`conversations/${conversationId}`)).body.data;
    expect(restored.mode).toBe("ask");
    expect(restored.interaction.id).toBe(paused.body.interaction.id);
    expect(restored.pending).toEqual([]);
    expect((await post("chat-mcp", { ...payload, requestId: randomUUID() })).status).toBe(409);
    const path = `conversations/${conversationId}/interactions/${paused.body.interaction.id}/answer`;
    const answerPayload = { requestId: randomUUID(), optionId: "confirm" };
    expect((await post(path, answerPayload, 1)).status).toBe(404);
    expect((await post(path, { requestId: randomUUID(), customAnswer: "yes" })).status).toBe(422);
    expect((await post(path, { requestId: randomUUID(), optionId: "not-an-option" })).status).toBe(422);
    completion.mockResolvedValueOnce(answer("Created after approval."));
    const finished = await post(path, answerPayload);
    expect(finished.body.status).toBe("completed");
    expect(await Task.countDocuments({ title: "Ask approved" })).toBe(1);
    expect((await post(path, answerPayload)).body).toEqual(finished.body);
    expect((await post(path, { ...answerPayload, optionId: "cancel" })).status).toBe(409);
    expect(completion).toHaveBeenCalledTimes(2);
    await expect(conversationRepository.checkpoint(oldTurn!._id, [], oldTurn!.executionToken)).rejects.toMatchObject({ statusCode: 504 });
    const history = (await get(`conversations/${conversationId}`)).body.data;
    expect(history.interaction).toBeUndefined();
    expect(history.messages.some((m: { interaction?: { answer: { optionId: string } } }) => m.interaction?.answer.optionId === "confirm")).toBe(true);
  });

  it("clarification does not approve a following write, and each interaction has its own answer", async () => {
    const conversationId = await create();
    const question = { question: "Which task?", options: [{ id: "read", label: "Read" }, { id: "write", label: "Write" }], allowCustomAnswer: true };
    completion.mockResolvedValueOnce(tool("grill_user", question));
    const paused = await post("chat-mcp", { conversationId, requestId: randomUUID(), userInput: "Help me", mode: "ask" });
    expect(paused.body.interaction.kind).toBe("clarification");
    const firstPath = `conversations/${conversationId}/interactions/${paused.body.interaction.id}/answer`;
    const firstAnswer = { requestId: randomUUID(), customAnswer: "Create a reading task" };
    completion.mockImplementationOnce(async ({ messages }) => {
      expect(messages.filter((m: { role: string }) => m.role === "tool").at(-1).content).toContain(firstAnswer.customAnswer);
      return tool("orbit_create_task", { title: "Clarified task", idempotencyKey: randomUUID() });
    });
    const approval = await post(firstPath, firstAnswer);
    expect(approval.body.status).toBe("awaiting_user");
    expect(approval.body.interaction.kind).toBe("confirmation");
    expect(await Task.countDocuments({ title: "Clarified task" })).toBe(0);
    expect((await post(firstPath, firstAnswer)).body.interaction.id).toBe(approval.body.interaction.id);
    const secondPath = `conversations/${conversationId}/interactions/${approval.body.interaction.id}/answer`;
    expect((await post(secondPath, { requestId: firstAnswer.requestId, optionId: "confirm" })).status).toBe(409);
    completion.mockResolvedValueOnce(answer("Done"));
    expect((await post(secondPath, { requestId: randomUUID(), optionId: "confirm" })).body.status).toBe("completed");
    expect(await Task.countDocuments({ title: "Clarified task" })).toBe(1);
  });

  it("cancels pending batches without executing them and leaves valid history", async () => {
    const conversationId = await create();
    const firstTool = tool("grill_user", { question: "Pick", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] });
    firstTool.choices[0].message.tool_calls.push(tool("orbit_create_task", { title: "Must not run", idempotencyKey: randomUUID() }).choices[0].message.tool_calls[0]);
    completion.mockResolvedValueOnce(firstTool);
    const paused = await post("chat-mcp", { conversationId, requestId: randomUUID(), userInput: "Choose", mode: "ask" });
    const path = `conversations/${conversationId}/interactions/${paused.body.interaction.id}/cancel`;
    const payload = { requestId: randomUUID() };
    const cancelled = await post(path, payload);
    expect(cancelled.body.status).toBe("cancelled");
    expect((await post(path, payload)).body).toEqual(cancelled.body);
    expect(await Task.countDocuments({ title: "Must not run" })).toBe(0);
    const saved = await ChatTurn.findOne({ conversationId });
    expect(saved!.messages.filter(m => m.role === "tool")).toHaveLength(2);
    completion.mockResolvedValueOnce(answer("Ready"));
    expect((await post("chat-mcp", { conversationId, requestId: randomUUID(), userInput: "Hello", mode: "auto" })).body.status).toBe("completed");
  });

  it("concurrent answers cannot execute a write twice", async () => {
    const conversationId = await create();
    completion.mockResolvedValueOnce(tool("orbit_create_task", { title: "Concurrent Ask", idempotencyKey: randomUUID() }));
    const paused = await post("chat-mcp", { conversationId, requestId: randomUUID(), userInput: "Create", mode: "ask" });
    const oldTurn = await ChatTurn.findOne({ conversationId });
    const path = `conversations/${conversationId}/interactions/${paused.body.interaction.id}/answer`;
    const payload = { requestId: randomUUID(), optionId: "confirm" };
    let release!: (value: unknown) => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    completion.mockImplementationOnce(() => { entered(); return new Promise(resolve => { release = resolve; }); });
    const first = post(path, payload).then(r => r);
    await started;
    await expect(conversationRepository.checkpoint(oldTurn!._id, [], oldTurn!.executionToken)).rejects.toMatchObject({ statusCode: 504 });
    await conversationRepository.finish(oldTurn!._id, "Old worker failure", "failed", oldTurn!.executionToken);
    expect((await ChatTurn.findOne({ conversationId }))!.status).toBe("processing");
    expect((await post(path, payload)).body.status).toBe("processing");
    expect((await post(path, { ...payload, requestId: randomUUID() })).status).toBe(409);
    expect(await Task.countDocuments({ title: "Concurrent Ask" })).toBe(1);
    release(answer("Created once"));
    expect((await first).body.status).toBe("completed");
    expect(completion).toHaveBeenCalledTimes(2);
  });

  it("asks for a fresh confirmation when the task changes while waiting", async () => {
    const conversationId = await create();
    const category = await Category.findOne({ userId: users[0] });
    const task = await Task.create({ title: "Original title", categoryId: category!._id, status: "pending", priority: "Low" });
    completion.mockResolvedValueOnce(tool("orbit_update_task", { taskId: String(task._id), idempotencyKey: randomUUID(), changes: { priority: "High" } }));
    const paused = await post("chat-mcp", { conversationId, requestId: randomUUID(), userInput: "Raise priority", mode: "ask" });
    await Task.updateOne({ _id: task._id }, { title: "Changed elsewhere" });
    const renewed = await post(`conversations/${conversationId}/interactions/${paused.body.interaction.id}/answer`, { requestId: randomUUID(), optionId: "confirm" });
    expect(renewed.body.status).toBe("awaiting_user");
    expect(renewed.body.interaction.id).not.toBe(paused.body.interaction.id);
    expect(JSON.stringify(renewed.body.interaction.details)).toContain("Changed elsewhere");
    expect((await Task.findById(task._id))!.priority).toBe("Low");
    completion.mockResolvedValueOnce(answer("Priority changed"));
    const finished = await post(`conversations/${conversationId}/interactions/${renewed.body.interaction.id}/answer`, { requestId: randomUUID(), optionId: "confirm" });
    expect(finished.body.status).toBe("completed");
    expect((await Task.findById(task._id))!.priority).toBe("High");
  });

  it("fences a worker that loses its lease after checkpoint but before the write transaction", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const conversationId = await create();
    completion.mockResolvedValueOnce(tool("orbit_create_task", { title: "Expired worker write", idempotencyKey: randomUUID() }));
    const paused = await post("chat-mcp", { conversationId, requestId: randomUUID(), userInput: "Create", mode: "ask" });
    const transaction = writeRepository.transaction.bind(writeRepository);
    let nextTurnId: string | undefined;
    vi.spyOn(writeRepository, "transaction").mockImplementationOnce(async (userId, operation) => {
      await ChatTurn.updateOne({ conversationId }, { expiresAt: new Date(0) });
      await Conversation.updateOne({ _id: conversationId }, { busyUntil: new Date(0) });
      const next = await conversationRepository.claim(String(users[0]), conversationId, randomUUID(), "A newer turn");
      nextTurnId = next.turn._id;
      return transaction(userId, operation);
    });
    const result = await post(`conversations/${conversationId}/interactions/${paused.body.interaction.id}/answer`, { requestId: randomUUID(), optionId: "confirm" });
    expect(result.body.status).toBe("failed");
    expect(await Task.countDocuments({ title: "Expired worker write" })).toBe(0);
    expect((await Conversation.findById(conversationId))!.activeTurn).toBe(nextTurnId);
    expect((await ChatTurn.findById(nextTurnId))!.status).toBe("processing");
  });
});
