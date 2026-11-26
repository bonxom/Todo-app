import { personalSkillService } from "../personalSkillService.js";
import UserSkill from "../../models/UserSkill.js";
import UserSkillQuota from "../../models/UserSkillQuota.js";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
const completion = vi.hoisted(() => vi.fn());
vi.mock("../../libs/aiClient.js", () => ({
  getAiClient: () => ({ chat: { completions: { create: completion } } }),
}));
vi.mock("../../config/env.js", () => ({ getAiModel: () => "test-model" }));
import aiRoutes from "../../routes/aiRoutes.js";
import { errorHandler } from "../../error/errorHandler.js";
import { requestContext } from "../../error/requestContext.js";
import User from "../../models/User.js";
import Category from "../../models/Category.js";
import Project from "../../models/Project.js";
import Task from "../../models/Task.js";
import Stat from "../../models/Stat.js";
import Conversation from "../../models/Conversation.js";
import ChatTurn from "../../models/ChatTurn.js";
import TaskProposal from "../../models/A2UI/TaskProposal.js";
import {
  McpWriteReceipt,
  writeRepository,
} from "../../mcp/repositories/writeRepository.js";
import { chatTurnRepository } from "../../repositories/chatTurnRepository.js";
import { taskWriteService } from "../../mcp/services/taskWriteService.js";

const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const users = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const secret = "conversation-test-only";
const app = express();
app.use(requestContext);
app.use(express.json());
app.use("/api/ai", aiRoutes);
app.use(errorHandler);
const token = (index = 0) =>
  `Bearer ${jwt.sign({ id: String(users[index]) }, secret, { expiresIn: "1h" })}`;
const post = (path: string, body: object, user = 0) =>
  request(app)
    .post(`/api/ai/${path}`)
    .set("Authorization", token(user))
    .send(body);
const get = (path: string, user = 0) =>
  request(app).get(`/api/ai/${path}`).set("Authorization", token(user));
const patch = (path: string, body: object, user = 0) =>
  request(app)
    .patch(`/api/ai/${path}`)
    .set("Authorization", token(user))
    .send(body);
const answer = (content: string) => ({
  choices: [{ message: { role: "assistant", content } }],
});
async function* streamReply(content: string) {
  yield { choices: [{ index: 0, delta: { content }, finish_reason: "stop" }] };
}
const tool = (name: string, args: object) => ({
  choices: [
    {
      message: {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: randomUUID(),
            type: "function",
            function: { name, arguments: JSON.stringify(args) },
          },
        ],
      },
    },
  ],
});
async function create() {
  const id = randomUUID();
  expect((await post("conversations", { conversationId: id })).status).toBe(
    201,
  );
  return id;
}

describe.skipIf(!uri)("persistent conversations HTTP + MCP + MongoDB", () => {
  beforeAll(async () => {
    if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(uri))
      throw new Error("Use disposable loopback MongoDB");
    vi.stubEnv("JWT_SECRET", secret);
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "false");
    await mongoose.connect(uri, {
      dbName: `orbit_memory_test_${process.pid}_${Date.now()}`,
    });
    await User.collection.insertMany(
      users.map((_id, index) => ({
        _id,
        role: "USER",
        name: `user-${index}`,
        email: `memory-${index}@example.test`,
      })),
    );
    await Category.create(
      users.map((userId) => ({ userId, name: "Uncategorized" })),
    );
    await Conversation.init();
    await ChatTurn.init();
    await Project.init();
    await Task.init();
    await Stat.init();
    await McpWriteReceipt.init();
  });
  afterEach(() => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "false");
    vi.stubEnv("A2UI_INTERACTIVE_ENABLED", "false");
    completion.mockReset();
    vi.restoreAllMocks();
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    vi.unstubAllEnvs();
  });

  it("scopes the first turn and history summary to a project owned by the caller", async () => {
    const project = await Project.create({
      userId: users[0],
      name: "Website launch",
      color: "#14675f",
      status: "active",
    });
    const projectId = String(project._id);
    const conversationId = randomUUID();
    const payload = { conversationId, projectId };

    expect((await post("conversations", payload, 1)).status).toBe(404);
    expect(await Conversation.findById(conversationId)).toBeNull();
    expect((await post("conversations", payload)).status).toBe(201);
    expect((await post("conversations", payload)).body).toEqual({
      conversationId,
    });
    expect((await get("conversations")).body.data).not.toContainEqual(
      expect.objectContaining({ id: conversationId }),
    );

    const requestId = randomUUID();
    completion.mockResolvedValueOnce(answer("Let's plan the launch."));
    expect(
      (
        await post("chat-mcp", {
          conversationId,
          requestId,
          userInput: "Plan the launch",
        })
      ).status,
    ).toBe(200);
    const turn = await ChatTurn.findOne({ requestId });
    expect(String(turn?.contextProjectId)).toBe(projectId);
    expect((await get("conversations")).body.data).toContainEqual(
      expect.objectContaining({ id: conversationId, projectId }),
    );
    expect((await get("conversations", 1)).body.data).not.toContainEqual(
      expect.objectContaining({ id: conversationId }),
    );
  });

  it.each(["answer", "question", "failure"])(
    "persists successful skill reads through %s and exposes metadata only",
    async (ending) => {
      await Promise.all([UserSkill.init(), UserSkillQuota.init()]);
      const skill = await personalSkillService.create(String(users[0]), {
        name: "Writing",
        description: "Writing advice",
        instructions: "SECRET_PERSONAL_SKILL_INSTRUCTIONS",
      });
      const conversationId = await create();
      const expected = [{ id: skill.id, name: skill.name, version: 1 }];
      try {
        completion.mockResolvedValueOnce(
          tool("read_skill", { skillId: skill.id, version: 1 }),
        );
        if (ending === "failure")
          completion.mockRejectedValueOnce(new Error("provider unavailable"));
        else if (ending === "question")
          completion.mockResolvedValueOnce(
            tool("grill_user", {
              question: "Which style?",
              options: [
                { id: "short", label: "Short" },
                { id: "long", label: "Long" },
              ],
            }),
          );
        else completion.mockResolvedValueOnce(answer("Done"));
        const result = await post("chat-mcp", {
          conversationId,
          requestId: randomUUID(),
          userInput: "Help me write",
        });
        expect(result.status).toBe(200);
        expect(result.body.skillsRead).toEqual(expected);
        const persisted = await ChatTurn.findOne({ conversationId });
        expect(
          persisted?.skillsRead?.map((read) => ({
            id: read.id,
            name: read.name,
            version: read.version,
          })),
        ).toEqual(expected);
        const history = await get(`conversations/${conversationId}`);
        expect(
          history.body.data.messages
            .filter((m: { sender: string }) => m.sender === "bot")
            .at(-1).skillsRead,
        ).toEqual(expected);
        expect(JSON.stringify(history.body)).not.toContain(skill.instructions);
        if (ending === "answer") {
          await personalSkillService.update(String(users[0]), skill.id, 1, {
            ...skill,
            enabled: false,
          });
          completion
            .mockImplementationOnce(async ({ messages }) => {
              expect(JSON.stringify(messages)).not.toContain(
                skill.instructions,
              );
              const overview = messages.at(-1);
              expect(JSON.parse(overview.content).skills).toEqual([]);
              return tool("read_skill", { skillId: skill.id, version: 1 });
            })
            .mockImplementationOnce(async ({ messages }) => {
              expect(JSON.parse(messages.at(-1).content).code).toBe(
                "SKILL_NOT_FOUND",
              );
              return answer("Disabled");
            });
          const next = await post("chat-mcp", {
            conversationId,
            requestId: randomUUID(),
            userInput: "Write again",
          });
          expect(next.body.status).toBe("completed");
          expect(next.body.skillsRead).toEqual([]);
        }
      } finally {
        await UserSkill.deleteMany({ userId: users[0] });
        await UserSkillQuota.deleteMany({ userId: users[0] });
      }
    },
  );

  it("remembers actual tool IDs in the next turn and restores visible history", async () => {
    const conversationId = await create();
    completion
      .mockResolvedValueOnce(
        tool("orbit_create_task", {
          title: "Read book",
          idempotencyKey: randomUUID(),
        }),
      )
      .mockResolvedValueOnce(answer("Created your reading task."));
    const first = {
      conversationId,
      requestId: randomUUID(),
      userInput: "Create reading task",
    };
    expect((await post("chat-mcp", first)).body.data).toBe(
      "Created your reading task.",
    );
    const task = await Task.findOne({ title: "Read book" });
    expect(task?.status).toBe("pending");
    completion
      .mockImplementationOnce(async ({ messages }) => {
        expect(messages).toEqual(
          expect.arrayContaining([{ role: "user", content: first.userInput }]),
        );
        const result = messages.find(
          (m: { role: string; content?: string }) =>
            m.role === "tool" &&
            !!JSON.parse(m.content ?? "{}").structuredContent?.task,
        );
        const rememberedId = JSON.parse(result.content).structuredContent.task
          .id;
        expect(rememberedId).toBe(String(task!._id));
        return tool("orbit_update_task", {
          taskId: rememberedId,
          idempotencyKey: randomUUID(),
          changes: { status: "in-progress" },
        });
      })
      .mockResolvedValueOnce(
        tool("orbit_update_task", {
          taskId: String(task!._id),
          idempotencyKey: randomUUID(),
          changes: { status: "completed" },
        }),
      )
      .mockResolvedValueOnce(answer("Marked it complete."));
    const second = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Complete it",
    });
    expect(second.status).toBe(200);
    expect(second.body.status).toBe("completed");
    expect((await Task.findById(task!._id))?.status).toBe("completed");
    const restored = await get(`conversations/${conversationId}`);
    expect(restored.headers["cache-control"]).toBe("no-store");
    const history = restored.body.data;
    expect(history.activities).toHaveLength(3);
    expect(
      history.activities.every(
        (activity: { status: string }) => activity.status === "succeeded",
      ),
    ).toBe(true);
    expect(history.messages.map((m: { text: string }) => m.text)).toEqual([
      "Create reading task",
      "Created your reading task.",
      "Complete it",
      "Marked it complete.",
    ]);
    expect(JSON.stringify(history)).not.toContain("tool_calls");
    expect((await get("conversations/latest")).body.data.conversationId).toBe(
      conversationId,
    );
  });

  it("deduplicates concurrent requests and completed retries without rerunning tools", async () => {
    const conversationId = await create();
    let release!: (value: unknown) => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    completion
      .mockImplementationOnce(() => {
        entered();
        return new Promise((resolve) => {
          release = resolve;
        });
      })
      .mockResolvedValueOnce(answer("Created once."));
    const payload = {
      conversationId,
      requestId: randomUUID(),
      userInput: "Create unique",
    };
    const first = post("chat-mcp", payload).then((response) => response);
    await started;
    expect((await post("chat-mcp", payload)).status).toBe(409);
    expect(
      (await post("chat-mcp", { ...payload, requestId: randomUUID() })).status,
    ).toBe(409);
    release(
      tool("orbit_create_task", {
        title: "Unique",
        idempotencyKey: randomUUID(),
      }),
    );
    const result = await first;
    expect(result.body.status).toBe("completed");
    expect((await post("chat-mcp", payload)).body).toEqual(result.body);
    expect(completion).toHaveBeenCalledTimes(2);
    expect(await Task.countDocuments({ title: "Unique" })).toBe(1);
    expect(await ChatTurn.countDocuments({ conversationId })).toBe(1);
    expect(
      (await post("chat-mcp", { ...payload, userInput: "Different" })).status,
    ).toBe(409);
  });

  it("rejects cross-user reads, writes and conversation ID reuse", async () => {
    const conversationId = await create();
    expect((await get(`conversations/${conversationId}`, 1)).status).toBe(404);
    expect((await post("conversations", { conversationId }, 1)).status).toBe(
      404,
    );
    expect(
      (
        await post(
          "chat-mcp",
          {
            conversationId,
            requestId: randomUUID(),
            userInput: "Read secrets",
          },
          1,
        )
      ).status,
    ).toBe(404);
    expect((await get("conversations/latest", 1)).body.data).toBeNull();
    expect(completion).not.toHaveBeenCalled();
    expect(
      (await request(app).get("/api/ai/conversations/latest")).status,
    ).toBe(401);
  });

  it("retains committed tool results after provider failure and never reruns a failed turn", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const conversationId = await create();
    completion
      .mockResolvedValueOnce(
        tool("orbit_create_task", {
          title: "Survives failure",
          idempotencyKey: randomUUID(),
        }),
      )
      .mockRejectedValueOnce(new Error("provider down"));
    const payload = {
      conversationId,
      requestId: randomUUID(),
      userInput: "Create task",
    };
    const result = await post("chat-mcp", payload);
    expect(result.body.status).toBe("failed");
    await post("chat-mcp", payload);
    expect(completion).toHaveBeenCalledTimes(2);
    expect(await Task.countDocuments({ title: "Survives failure" })).toBe(1);
    const turn = await ChatTurn.findOne({ conversationId });
    expect(turn?.messages.some((m) => m.role === "tool")).toBe(true);
    expect(
      (await get(`conversations/${conversationId}`)).body.data.messages,
    ).toHaveLength(2);
  });

  it("never restarts an expired claim and repairs unfinished tool context", async () => {
    const conversationId = await create();
    const requestId = randomUUID();
    const { turn } = await chatTurnRepository.claim(
      String(users[0]),
      conversationId,
      requestId,
      "Interrupted",
    );
    await chatTurnRepository.checkpoint(turn._id, [
      { role: "user", content: "Interrupted" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "uncertain",
            type: "function",
            function: { name: "orbit_create_task", arguments: "{}" },
          },
        ],
      },
    ]);
    await ChatTurn.updateOne({ _id: turn._id }, { expiresAt: new Date(0) });
    await Conversation.updateOne(
      { _id: conversationId },
      { busyUntil: new Date(0) },
    );
    expect(
      (
        await post("chat-mcp", {
          conversationId,
          requestId,
          userInput: "Interrupted",
        })
      ).body.status,
    ).toBe("failed");
    expect(completion).not.toHaveBeenCalled();
    completion.mockImplementationOnce(async ({ messages }) => {
      expect(messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "tool",
            tool_call_id: "uncertain",
            content: expect.stringContaining("outcome unknown"),
          }),
        ]),
      );
      return answer("I will check first.");
    });
    expect(
      (
        await post("chat-mcp", {
          conversationId,
          requestId: randomUUID(),
          userInput: "What happened?",
        })
      ).body.data,
    ).toBe("I will check first.");
  });

  it("paginates saved messages and starts a fresh conversation without old context", async () => {
    const conversationId = await create();
    await ChatTurn.insertMany(
      Array.from({ length: 55 }, (_, index) => ({
        _id: randomUUID(),
        userId: users[0],
        conversationId,
        requestId: randomUUID(),
        sequence: index + 1,
        userInput: `message-${index + 1}`,
        status: "completed",
        response: "ok",
        expiresAt: new Date(),
      })),
    );
    const latest = (await get(`conversations/${conversationId}`)).body.data;
    expect(latest.messages).toHaveLength(100);
    expect(latest.before).toBe(6);
    const earlier = (await get(`conversations/${conversationId}?before=6`)).body
      .data;
    expect(earlier.messages).toHaveLength(10);
    expect(earlier.before).toBeNull();
    const fresh = await create();
    completion.mockImplementationOnce(async ({ messages }) => {
      expect(messages).toHaveLength(2);
      return answer("Fresh start");
    });
    await post("chat-mcp", {
      conversationId: fresh,
      requestId: randomUUID(),
      userInput: "Hello",
    });
    expect((await get("conversations/latest")).body.data.conversationId).toBe(
      fresh,
    );
  });

  const choose = (
    conversationId: string,
    interaction: { id: string },
    selection: { optionId?: string; customAnswer?: string; cancel?: boolean },
    userInput = "Xác nhận",
  ) => ({
    conversationId,
    requestId: randomUUID(),
    userInput,
    mode: "ask",
    selection: { interactionId: interaction.id, ...selection },
  });

  it("lets Ask write directly and uses the model's final response", async () => {
    const conversationId = await create();
    completion
      .mockResolvedValueOnce(
        tool("orbit_create_task", {
          title: "Ask direct",
          idempotencyKey: randomUUID(),
        }),
      )
      .mockResolvedValueOnce(answer("Đã thêm task cho bạn."));
    const payload = {
      conversationId,
      requestId: randomUUID(),
      userInput: "Create task",
      mode: "ask",
    };
    const result = await post("chat-mcp", payload);
    expect(result.body.status).toBe("completed");
    expect(result.body.data).toBe("Đã thêm task cho bạn.");
    expect(result.body.interaction).toBeUndefined();
    expect(await Task.countDocuments({ title: "Ask direct" })).toBe(1);
    expect((await post("chat-mcp", payload)).body).toEqual(result.body);
    expect(completion).toHaveBeenCalledTimes(2);
  });

  it("passes clarification as user input and lets the model continue writing without another gate", async () => {
    const conversationId = await create();
    completion.mockResolvedValueOnce(
      tool("grill_user", {
        question: "Which task?",
        options: [
          { id: "read", label: "Read" },
          { id: "write", label: "Write" },
        ],
        allowCustomAnswer: true,
      }),
    );
    const menu = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Help me",
      mode: "ask",
    });
    const selected = choose(
      conversationId,
      menu.body.interaction,
      { customAnswer: "Create a reading task" },
      "Create a reading task",
    );
    completion.mockImplementationOnce(async ({ messages }) => {
      expect(
        messages.findLast((m: { role: string }) => m.role === "user"),
      ).toEqual({
        role: "user",
        content: selected.userInput,
      });
      const calls = messages.flatMap(
        (m: { tool_calls?: Array<{ id: string }> }) => m.tool_calls ?? [],
      );
      for (const call of calls)
        expect(
          messages.some(
            (m: { role: string; tool_call_id: string }) =>
              m.role === "tool" && m.tool_call_id === call.id,
          ),
        ).toBe(true);
      return tool("orbit_create_task", {
        title: "Clarified task",
        idempotencyKey: randomUUID(),
      });
    });
    completion.mockResolvedValueOnce(answer("Đã tạo công việc đọc sách."));
    const result = await post("chat-mcp", selected);
    expect(result.body.status).toBe("completed");
    expect(result.body.data).toBe("Đã tạo công việc đọc sách.");
    expect(result.body.interaction).toBeUndefined();
    expect(await Task.countDocuments({ title: "Clarified task" })).toBe(1);
    expect(await ChatTurn.countDocuments({ conversationId })).toBe(2);
  });

  it("skips remaining batch calls and cancels via an ordinary chat request", async () => {
    const conversationId = await create();
    const batch = tool("grill_user", {
      question: "Pick",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    });
    batch.choices[0].message.tool_calls.push(
      tool("orbit_create_task", {
        title: "Must not run",
        idempotencyKey: randomUUID(),
      }).choices[0].message.tool_calls[0],
    );
    completion.mockResolvedValueOnce(batch);
    const menu = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Choose",
      mode: "ask",
    });
    const oldTurn = await ChatTurn.findOne({ conversationId });
    expect(oldTurn!.messages.filter((m) => m.role === "tool")).toHaveLength(3);
    const payload = choose(
      conversationId,
      menu.body.interaction,
      { cancel: true },
      "Hủy",
    );
    const cancelled = await post("chat-mcp", payload);
    expect(cancelled.body.status).toBe("completed");
    expect(cancelled.body.data).toBe("");
    const historyAfterCancel = (await get(`conversations/${conversationId}`))
      .body.data.messages;
    expect(
      historyAfterCancel.filter(
        (message: { sender: string }) => message.sender === "bot",
      ),
    ).toHaveLength(1);
    expect((await post("chat-mcp", payload)).body).toEqual(cancelled.body);
    expect(await ChatTurn.countDocuments({ conversationId })).toBe(2);
    expect(await Task.countDocuments({ title: "Must not run" })).toBe(0);
    expect(completion).toHaveBeenCalledTimes(1);
    expect(
      (await get(`conversations/${conversationId}`)).body.data.interaction,
    ).toBeUndefined();
  });

  it("lets a new explicit request supersede a menu", async () => {
    const conversationId = await create();
    completion.mockResolvedValueOnce(
      tool("grill_user", {
        question: "Create this task?",
        options: [
          { id: "confirm", label: "Xác nhận" },
          { id: "cancel", label: "Hủy" },
        ],
      }),
    );
    const previous = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Help",
      mode: "ask",
    });
    completion
      .mockResolvedValueOnce(
        tool("orbit_create_task", {
          title: "New request",
          idempotencyKey: randomUUID(),
        }),
      )
      .mockResolvedValueOnce(answer("Created"));
    const result = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Create New request",
      mode: "ask",
    });
    expect(result.body.data).toBe("Created");
    expect(await Task.countDocuments({ title: "New request" })).toBe(1);
    expect(
      (
        await post(
          "chat-mcp",
          choose(conversationId, previous.body.interaction, {
            optionId: "confirm",
          }),
        )
      ).status,
    ).toBe(409);
  });

  it("deduplicates concurrent selection turns and includes selection in pending recovery", async () => {
    const conversationId = await create();
    completion.mockResolvedValueOnce(
      tool("grill_user", {
        question: "Create this task?",
        options: [
          { id: "confirm", label: "Xác nhận" },
          { id: "cancel", label: "Hủy" },
        ],
      }),
    );
    const menu = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Create",
      mode: "ask",
    });
    const oldTurn = await ChatTurn.findOne({ conversationId });
    const payload = choose(conversationId, menu.body.interaction, {
      optionId: "confirm",
    });
    let release!: (value: unknown) => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    completion.mockImplementationOnce(() => {
      entered();
      return new Promise((resolve) => {
        release = resolve;
      });
    });
    const first = post("chat-mcp", payload).then((r) => r);
    await started;
    expect((await post("chat-mcp", payload)).status).toBe(409);
    expect(
      (await post("chat-mcp", { ...payload, requestId: randomUUID() })).status,
    ).toBe(409);
    const pending = (await get(`conversations/${conversationId}`)).body.data
      .pending[0];
    expect(pending).toMatchObject({
      requestId: payload.requestId,
      userInput: "Xác nhận",
      selection: payload.selection,
    });
    await expect(
      chatTurnRepository.checkpoint(oldTurn!._id, [], oldTurn!.executionToken),
    ).rejects.toMatchObject({ statusCode: 504 });
    await chatTurnRepository.finish(
      oldTurn!._id,
      "Old worker failure",
      "failed",
      oldTurn!.executionToken,
    );
    expect(await Task.countDocuments({ title: "Concurrent Ask" })).toBe(0);
    release(answer("Created once"));
    const finished = await first;
    expect(finished.body.status).toBe("completed");
    expect((await post("chat-mcp", payload)).body).toEqual(finished.body);
    expect(completion).toHaveBeenCalledTimes(2);
  });

  it("fences a selected-action worker whose lease expires before the write transaction", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const conversationId = await create();
    completion.mockResolvedValueOnce(
      tool("grill_user", {
        question: "Create this task?",
        options: [
          { id: "confirm", label: "Xác nhận" },
          { id: "cancel", label: "Hủy" },
        ],
      }),
    );
    const menu = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Create",
      mode: "ask",
    });
    const transaction = writeRepository.transaction.bind(writeRepository);
    let nextTurnId: string | undefined;
    vi.spyOn(writeRepository, "transaction").mockImplementationOnce(
      async (userId, operation) => {
        await ChatTurn.updateMany(
          { conversationId, status: "processing" },
          { expiresAt: new Date(0) },
        );
        await Conversation.updateOne(
          { _id: conversationId },
          { busyUntil: new Date(0) },
        );
        const next = await chatTurnRepository.claim(
          String(users[0]),
          conversationId,
          randomUUID(),
          "A newer turn",
        );
        nextTurnId = next.turn._id;
        return transaction(userId, operation);
      },
    );
    completion.mockResolvedValueOnce(
      tool("orbit_create_task", {
        title: "Expired worker write",
        idempotencyKey: randomUUID(),
      }),
    );
    const result = await post(
      "chat-mcp",
      choose(conversationId, menu.body.interaction, { optionId: "confirm" }),
    );
    expect(result.body.status).toBe("failed");
    expect(await Task.countDocuments({ title: "Expired worker write" })).toBe(
      0,
    );
    expect((await Conversation.findById(conversationId))!.activeTurn).toBe(
      nextTurnId,
    );
  });

  it("converts previously saved awaiting_user menus without resuming their old tool calls", async () => {
    const conversationId = await create();
    completion.mockResolvedValueOnce(
      tool("grill_user", {
        question: "Pick",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
      }),
    );
    const menu = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Choose",
      mode: "ask",
    });
    const old = await ChatTurn.findOne({ conversationId });
    await ChatTurn.updateOne(
      { _id: old!._id },
      {
        status: "awaiting_user",
        response: "",
        messages: old!.messages.filter(
          (m) => m.role === "user" || (m.role === "assistant" && m.tool_calls),
        ),
      },
    );
    await Conversation.updateOne(
      { _id: conversationId },
      { activeTurn: old!._id, busyUntil: null },
    );
    completion.mockResolvedValueOnce(answer("You chose A"));
    expect(
      (
        await post(
          "chat-mcp",
          choose(conversationId, menu.body.interaction, { optionId: "a" }, "A"),
        )
      ).body.status,
    ).toBe("completed");
    expect((await ChatTurn.findById(old!._id))!.status).toBe("completed");
    expect(await ChatTurn.countDocuments({ conversationId })).toBe(2);
    expect(
      (await ChatTurn.findById(old!._id))!.messages.some(
        (m) => m.role === "tool",
      ),
    ).toBe(true);
  });

  it("does not replay a selected turn after the provider fails following a write", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const conversationId = await create();
    completion.mockResolvedValueOnce(
      tool("grill_user", {
        question: "Create this task?",
        options: [
          { id: "confirm", label: "Xác nhận" },
          { id: "cancel", label: "Hủy" },
        ],
      }),
    );
    const menu = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Create",
      mode: "ask",
    });
    completion
      .mockResolvedValueOnce(
        tool("orbit_create_task", {
          title: "Approval survives failure",
          idempotencyKey: randomUUID(),
        }),
      )
      .mockRejectedValueOnce(new Error("Provider down"));
    const payload = choose(conversationId, menu.body.interaction, {
      optionId: "confirm",
    });
    const result = await post("chat-mcp", payload);
    expect(result.body.status).toBe("failed");
    expect((await post("chat-mcp", payload)).body).toEqual(result.body);
    expect(
      (await post("chat-mcp", { ...payload, requestId: randomUUID() })).status,
    ).toBe(409);
    expect(
      await Task.countDocuments({ title: "Approval survives failure" }),
    ).toBe(1);
  });

  it("automatically persists proposals and prohibits direct creation without client intent", async () => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    const conversationId = await create();
    const writeSpy = vi.spyOn(taskWriteService, "create");

    // 1. Model tries orbit_create_task in proposal mode, rejected, then calls propose_tasks
    completion
      .mockResolvedValueOnce(
        tool("orbit_create_task", {
          title: "Read chapter 1",
          idempotencyKey: randomUUID(),
        }),
      )
      .mockResolvedValueOnce(
        tool("propose_tasks", {
          items: [{ title: "Read chapter 1", priority: "Medium" }],
        }),
      );

    const proposalTurn = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Draft reading plan",
      mode: "ask",
    });

    expect(proposalTurn.body.status).toBe("completed");
    expect(proposalTurn.body.proposal).toBeDefined();
    expect(proposalTurn.body.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "proposal_created",
          status: "succeeded",
          resourceId: proposalTurn.body.proposal.id,
        }),
      ]),
    );
    expect(proposalTurn.body.proposal.items).toHaveLength(1);
    expect(proposalTurn.body.proposal.items[0].title).toBe("Read chapter 1");
    expect(writeSpy).not.toHaveBeenCalled();
    expect(await Task.countDocuments({ title: "Read chapter 1" })).toBe(0);

    const snapshot = (await get(`conversations/${conversationId}`)).body.data;
    expect(
      snapshot.messages.some(
        (message: { proposal?: { items: unknown[] } }) =>
          message.proposal?.items.length === 1,
      ),
    ).toBe(true);

    // 2. Repeat after a clarification answer that omits intent
    completion.mockResolvedValueOnce(
      tool("grill_user", {
        question: "Select focus area",
        options: [
          { id: "opt-1", label: "Math" },
          { id: "opt-2", label: "Science" },
        ],
      }),
    );
    const menuResult = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Plan subjects",
      mode: "ask",
    });
    expect(menuResult.body.interaction).toBeDefined();

    // Client answers menu without specifying intent
    completion
      .mockResolvedValueOnce(
        tool("orbit_create_task", {
          title: "Study Science",
          idempotencyKey: randomUUID(),
        }),
      )
      .mockResolvedValueOnce(
        tool("propose_tasks", {
          items: [{ title: "Study Science", priority: "High" }],
        }),
      );

    const answerTurn = await post(
      "chat-mcp",
      choose(
        conversationId,
        menuResult.body.interaction,
        { optionId: "opt-2" },
        "Science",
      ),
    );

    expect(answerTurn.body.status).toBe("completed");
    expect(answerTurn.body.proposal).toBeDefined();
    expect(answerTurn.body.proposal.items[0].title).toBe("Study Science");
    expect(writeSpy).not.toHaveBeenCalled();
    expect(await Task.countDocuments({ title: "Study Science" })).toBe(0);

    // 3. Ordinary chat write regression: ordinary chat allows task creation
    completion
      .mockResolvedValueOnce(
        tool("orbit_create_task", {
          title: "Ordinary Task",
          idempotencyKey: randomUUID(),
        }),
      )
      .mockResolvedValueOnce(answer("Created"));

    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "false");
    const normalTurn = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Create ordinary task",
    });

    expect(normalTurn.body.status).toBe("completed");
    expect(await Task.countDocuments({ title: "Ordinary Task" })).toBe(1);
    expect(writeSpy).toHaveBeenCalled();
  });

  it("creates a task directly in Auto mode with title only, handles idempotent replay, and reports failed tool execution", async () => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    const conversationId = await create();
    const requestId = randomUUID();

    completion
      .mockResolvedValueOnce(
        tool("orbit_create_task", {
          title: "Send the report",
          idempotencyKey: randomUUID(),
        }),
      )
      .mockResolvedValueOnce(answer("Created task Send the report"));

    const createTurn = await post("chat-mcp", {
      conversationId,
      requestId,
      userInput: "Create a task to send the report",
      mode: "auto",
    });

    expect(createTurn.body.status).toBe("completed");
    const createdActivity = createTurn.body.activities?.find(
      (a: { kind: string }) => a.kind === "task_created",
    );
    expect(createdActivity).toMatchObject({
      kind: "task_created",
      status: "succeeded",
    });
    expect(await Task.countDocuments({ title: "Send the report" })).toBe(1);

    // Replay with the same requestId
    const replayTurn = await post("chat-mcp", {
      conversationId,
      requestId,
      userInput: "Create a task to send the report",
      mode: "auto",
    });
    expect(replayTurn.body).toEqual(createTurn.body);
    expect(await Task.countDocuments({ title: "Send the report" })).toBe(1);

    // Separate turn where create fails
    vi.spyOn(taskWriteService, "create").mockRejectedValueOnce(
      new Error("Database write error"),
    );
    let failedToolResult: unknown;
    completion
      .mockResolvedValueOnce(
        tool("orbit_create_task", {
          title: "Failed task",
          idempotencyKey: randomUUID(),
        }),
      )
      .mockImplementationOnce(
        async ({
          messages,
        }: {
          messages: Array<{
            role: string;
            tool_call_id?: string;
            content: string;
          }>;
        }) => {
          const reversed = [...messages].reverse();
          const toolMsg =
            reversed.find(
              (m) => m.role === "tool" && m.tool_call_id?.startsWith("call-"),
            ) ?? reversed.find((m) => m.role === "tool");
          failedToolResult = JSON.parse(toolMsg?.content ?? "{}");
          return answer("Failed to create task");
        },
      );

    const failedTurn = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Create failed task",
      mode: "auto",
    });
    expect(failedToolResult).toMatchObject({ isError: true });
    expect(failedTurn.body.activities ?? []).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "task_created",
          status: "succeeded",
        }),
      ]),
    );
    expect(await Task.countDocuments({ title: "Failed task" })).toBe(0);
  });

  it("continues Auto mode after clarification and creates task with chosen project", async () => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    const conversationId = await create();
    const project = await Project.create({
      name: "Project A",
      userId: users[0],
      status: "active",
    });

    completion.mockResolvedValueOnce(
      tool("grill_user", {
        question: "Which project should I use?",
        options: [
          { id: String(project._id), label: "Project A" },
          { id: "other", label: "Other" },
        ],
      }),
    );

    const askTurn = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Create a deployment task",
      mode: "auto",
    });
    expect(askTurn.body.interaction).toBeDefined();
    const interactionId = askTurn.body.interaction.id;

    completion
      .mockResolvedValueOnce(
        tool("orbit_create_task", {
          title: "Deploy app",
          projectId: String(project._id),
          idempotencyKey: randomUUID(),
        }),
      )
      .mockResolvedValueOnce(answer("Created deployment task in Project A"));

    const selectionPayload = {
      conversationId,
      requestId: randomUUID(),
      userInput: "Project A",
      mode: "auto",
      selection: {
        interactionId,
        optionId: String(project._id),
      },
    };

    const answerTurn = await post("chat-mcp", selectionPayload);
    expect(selectionPayload).toMatchObject({
      mode: "auto",
      selection: { interactionId, optionId: String(project._id) },
    });
    expect(answerTurn.body.status).toBe("completed");
    expect(
      await Task.countDocuments({
        title: "Deploy app",
        projectId: project._id,
      }),
    ).toBe(1);
  });

  it("rejects legacy confirmation answers submitted in Auto mode", async () => {
    const conversationId = await create();
    const interactionId = randomUUID();
    await ChatTurn.create({
      _id: randomUUID(),
      conversationId,
      userId: users[0],
      requestId: randomUUID(),
      sequence: 1,
      userInput: "Delete everything",
      status: "completed",
      mode: "ask",
      response: "Are you sure?",
      expiresAt: new Date(Date.now() + 60000),
      messages: [{ role: "user", content: "Delete everything" }],
      interactions: [
        {
          id: interactionId,
          kind: "confirmation",
          question: "Are you sure?",
          options: [
            { id: "confirm", label: "Yes" },
            { id: "cancel", label: "No" },
          ],
          status: "pending",
        },
      ],
    });

    const res = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Yes",
      mode: "auto",
      selection: { interactionId, optionId: "confirm" },
    });
    expect(res.status).toBe(422);
  });
  it("blocks proposal requests and clarification continuations while disabled", async () => {
    const conversationId = await create();
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "false");
    const blocked = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Plan",
      intent: "task_proposal",
    });
    expect(blocked.status).toBe(409);
    expect(await ChatTurn.countDocuments({ conversationId })).toBe(0);
    expect(completion).not.toHaveBeenCalled();
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    completion.mockResolvedValueOnce(
      tool("grill_user", {
        question: "Choose",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
      }),
    );
    const menu = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Plan",
      mode: "ask",
      intent: "task_proposal",
    });
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "false");
    const result = await post(
      "chat-mcp",
      choose(conversationId, menu.body.interaction, { optionId: "a" }, "A"),
    );
    expect(result.status).toBe(409);
    expect(await ChatTurn.countDocuments({ conversationId })).toBe(1);
    expect(completion).toHaveBeenCalledTimes(1);
  });

  it("replays a proposal clarification answer with omitted intent", async () => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    const conversationId = await create();
    completion.mockResolvedValueOnce(
      tool("grill_user", {
        question: "Choose",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
      }),
    );
    const menu = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Plan",
      mode: "ask",
      intent: "task_proposal",
    });
    const payload = choose(
      conversationId,
      menu.body.interaction,
      { optionId: "a" },
      "A",
    );
    completion.mockResolvedValueOnce(
      tool("propose_tasks", { items: [{ title: "Proposal retry" }] }),
    );
    const first = await post("chat-mcp", payload);
    expect(first.status).toBe(200);
    const replay = await post("chat-mcp", payload);
    expect(replay.status).toBe(200);
    expect(replay.body.proposal.id).toBe(first.body.proposal.id);
    expect(completion).toHaveBeenCalledTimes(2);
  });

  it("snapshots project context into claimed ChatTurn and returns context status", async () => {
    const conversationId = await create();
    const project = await Project.create({
      userId: users[0],
      name: "Integration Project",
      color: "#ff0000",
      status: "active",
    });
    const projectId = String(project._id);

    const patchRes = await patch(
      `conversations/${conversationId}/context`,
      { projectId },
      0,
    );
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data).toEqual({
      conversationId,
      contextProjectId: projectId,
    });

    completion.mockResolvedValueOnce(answer("Hello with context"));
    const chatRes = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Check context",
    });
    expect(chatRes.status).toBe(200);

    const turn = await ChatTurn.findOne({ conversationId });
    expect(String(turn?.contextProjectId)).toBe(projectId);

    const getRes = await get(`conversations/${conversationId}`);
    expect(getRes.body.data.context).toEqual({
      projectId,
      available: true,
    });

    const crossPatch = await patch(
      `conversations/${conversationId}/context`,
      { projectId },
      1,
    );
    expect(crossPatch.status).toBe(404);

    await Project.deleteOne({ _id: project._id });
    const afterDeleteGet = await get(`conversations/${conversationId}`);
    expect(afterDeleteGet.body.data.context).toEqual({
      projectId: null,
      available: false,
    });
  });

  it("serializes context PATCH racing with claim and retains a stable retry snapshot", async () => {
    const conversationId = await create();
    const project = await Project.create({
      userId: users[0],
      name: "Race context",
      color: "#00ff00",
      status: "completed",
    });
    const requestId = randomUUID();
    const payload = {
      conversationId,
      requestId,
      userInput: "Discuss this project",
    };
    completion.mockResolvedValue(answer("Discussion only"));
    const [patchResult, sent] = await Promise.all([
      patch(`conversations/${conversationId}/context`, {
        projectId: String(project._id),
      }),
      post("chat-mcp", payload),
    ]);
    expect([200, 409]).toContain(patchResult.status);
    expect(sent.status).toBe(200);
    const saved = await ChatTurn.findOne({ requestId });
    const originalContext = saved?.contextProjectId
      ? String(saved.contextProjectId)
      : null;
    if (patchResult.status === 409) expect(originalContext).toBeNull();
    await patch(`conversations/${conversationId}/context`, { projectId: null });
    const providerCalls = completion.mock.calls.length;
    expect((await post("chat-mcp", payload)).body).toEqual(sent.body);
    expect(completion).toHaveBeenCalledTimes(providerCalls);
    const retried = await ChatTurn.findOne({ requestId });
    expect(
      retried?.contextProjectId ? String(retried.contextProjectId) : null,
    ).toBe(originalContext);
  });

  it("rejects context update during an active turn with 409", async () => {
    const conversationId = await create();
    const project = await Project.create({
      userId: users[0],
      name: "Active Turn Project",
      color: "#00ff00",
      status: "active",
    });

    let release!: (value: unknown) => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    completion.mockImplementationOnce(() => {
      entered();
      return new Promise((resolve) => {
        release = resolve;
      });
    });

    const first = post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Holding lease",
    }).then((response) => response);
    await started;

    const busyPatch = await patch(`conversations/${conversationId}/context`, {
      projectId: String(project._id),
    });
    expect(busyPatch.status).toBe(409);

    release(answer("Finished holding"));
    await first;
  });

  it("persists and replays read-only and proposal composed UI surfaces across history without calling provider", async () => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "true");
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const specFixture = JSON.parse(
      readFileSync(
        resolve(
          process.cwd(),
          "../frontend/src/test/fixtures/ui-composition-spec.json",
        ),
        "utf-8",
      ),
    );

    const conversationId = await create();

    // 1. Read-only present_ui turn
    completion
      .mockResolvedValueOnce(tool("load_skill", { skillId: "ui-composition" }))
      .mockResolvedValueOnce(tool("present_ui", specFixture.readonly));

    const readonlyReqId = randomUUID();
    const readonlyRes = await post("chat-mcp", {
      conversationId,
      requestId: readonlyReqId,
      userInput: "Show study plan",
    });
    expect(readonlyRes.status).toBe(200);
    expect(readonlyRes.body.surface).toBeDefined();
    const readonlySurfaceId = readonlyRes.body.surface.a2ui.surfaceId;

    // 2. Composed propose_tasks turn
    completion
      .mockResolvedValueOnce(tool("load_skill", { skillId: "ui-composition" }))
      .mockResolvedValueOnce(
        tool("propose_tasks", {
          items: [{ title: "Practice Essay", priority: "High" }],
          presentation: specFixture.proposal,
        }),
      );

    const proposalReqId = randomUUID();
    const proposalRes = await post("chat-mcp", {
      conversationId,
      requestId: proposalReqId,
      userInput: "Propose essay tasks",
    });
    expect(proposalRes.status).toBe(200);
    expect(proposalRes.body.surface).toBeDefined();
    expect(proposalRes.body.proposal).toBeDefined();
    const proposalSurfaceId = proposalRes.body.surface.a2ui.surfaceId;

    // 3. History replay does not call provider and returns exact saved surfaceIds
    completion.mockClear();
    const historyRes = await get(`conversations/${conversationId}`);
    expect(historyRes.status).toBe(200);
    expect(completion).not.toHaveBeenCalled();

    const botMessages = historyRes.body.data.messages.filter(
      (m: { sender: string }) => m.sender === "bot",
    );
    expect(botMessages).toHaveLength(2);
    expect(botMessages[0].surface?.a2ui.surfaceId).toBe(readonlySurfaceId);
    expect(botMessages[1].surface?.a2ui.surfaceId).toBe(proposalSurfaceId);
    expect(botMessages[1].proposal?.status).toBe("draft");
  });

  it("replays exact result when repeating request with same requestId even if timeZone differs", async () => {
    const conversationId = await create();
    completion.mockResolvedValueOnce(answer("First answer with time context"));

    const requestId = randomUUID();
    const firstRes = await post("chat-mcp", {
      conversationId,
      requestId,
      userInput: "What time is it?",
      timeZone: "Asia/Ho_Chi_Minh",
    });
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.data).toBe("First answer with time context");
    expect(completion).toHaveBeenCalledTimes(1);

    completion.mockClear();
    const repeatRes = await post("chat-mcp", {
      conversationId,
      requestId,
      userInput: "What time is it?",
      timeZone: "America/New_York",
    });
    expect(repeatRes.status).toBe(200);
    expect(repeatRes.body.data).toBe("First answer with time context");
    expect(completion).not.toHaveBeenCalled();
  });

  it("creates distinct timeContext snapshot on new requestId", async () => {
    const conversationId = await create();
    completion
      .mockResolvedValueOnce(answer("Turn 1 response"))
      .mockResolvedValueOnce(answer("Turn 2 response"));

    const res1 = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "First question",
      timeZone: "Asia/Ho_Chi_Minh",
    });
    expect(res1.status).toBe(200);

    const res2 = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Second question",
      timeZone: "Europe/London",
    });
    expect(res2.status).toBe(200);

    const turns = await ChatTurn.find({ conversationId }).sort({ sequence: 1 });
    expect(turns).toHaveLength(2);
    expect(turns[0].timeContext).toBeDefined();
    expect(turns[1].timeContext).toBeDefined();
    expect(turns[1].timeContext?.timeZone).toBe("Europe/London");
  });

  it("reads legacy turn without timeContext in history safely", async () => {
    const conversationId = await create();
    const legacyTurnId = randomUUID();
    await ChatTurn.create({
      _id: legacyTurnId,
      conversationId,
      userId: users[0],
      requestId: randomUUID(),
      sequence: 1,
      userInput: "Old query",
      status: "completed",
      mode: "auto",
      response: "Old response",
      messages: [{ role: "user", content: "Old query" }],
      expiresAt: new Date(Date.now() + 60000),
    });

    const historyRes = await get(`conversations/${conversationId}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data).toBeDefined();
    const userMsg = historyRes.body.data.messages.find(
      (m: { text: string }) => m.text === "Old query",
    );
    expect(userMsg).toBeDefined();
  });

  it("passes a committed cancellation to the model without cancelling the next chat turn", async () => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    const conversationId = await create();
    completion.mockResolvedValueOnce(
      tool("propose_tasks", { items: [{ title: "Read the report" }] }),
    );
    const draft = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Propose a reading task",
      mode: "ask",
    });
    expect(draft.status).toBe(200);
    const proposal = draft.body.proposal;
    const action = {
      action: "cancel",
      revision: proposal.revision,
      requestId: randomUUID(),
    };
    const path = `conversations/${conversationId}/proposals/${proposal.id}/actions`;
    let result: unknown;
    completion.mockImplementationOnce(async ({ messages }) => {
      result = JSON.parse(messages.at(-1).content);
      return streamReply("You cancelled that proposal.");
    });
    const cancelled = await post(path, action);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.proposal.status).toBe("cancelled");
    const replay = await post(path, action);
    expect(replay.status).toBe(200);
    expect(replay.body.data.proposal).toEqual(cancelled.body.data.proposal);
    expect(cancelled.body.data.continuation?.turnId).toBeDefined();
    expect(replay.body.data.continuation.turnId).toBe(
      cancelled.body.data.continuation.turnId,
    );
    await expect
      .poll(async () => {
        const { body } = await get(
          `conversations/${conversationId}/turns/${cancelled.body.data.continuation.turnId}`,
        );
        return body.data?.status;
      })
      .toBe("completed");
    expect(result).toEqual({
      status: "cancelled",
      proposalId: proposal.id,
      createdTasks: [],
    });

    completion.mockImplementationOnce(async ({ messages }) => {
      const system = messages.find(
        (m: { role: string }) => m.role === "system",
      );
      expect(system?.content).toContain(
        "Cancelled task proposals (server data):",
      );
      expect(system?.content).toContain(JSON.stringify(proposal.id));
      return answer("You cancelled that proposal.");
    });
    const next = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "What happened to that proposal?",
      mode: "ask",
    });
    expect(next.body.status).toBe("completed");
    expect(next.body.data).toBe("You cancelled that proposal.");
  });

  it("resumes the original proposal call with exactly the created tasks and reuses the run on replay", async () => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    const conversationId = await create();

    // 1. Create a 5-item proposal through chat
    const proposed = tool("propose_tasks", {
      items: [
        { title: "Task 1", priority: "Low" },
        { title: "Task 2", priority: "Medium" },
        { title: "Task 3", priority: "High" },
        { title: "Task 4", priority: "Medium" },
        { title: "Task 5", priority: "Low" },
      ],
    });
    const toolCallId = proposed.choices[0].message.tool_calls[0].id;
    completion.mockResolvedValueOnce(proposed);

    const proposalTurn = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Propose 5 tasks",
      mode: "ask",
    });
    expect(proposalTurn.body.status).toBe("completed");
    const proposal = proposalTurn.body.proposal;
    expect(proposal.items).toHaveLength(5);

    const providerCallsBeforeConfirm = completion.mock.calls.length;

    // 2. Change a title and confirm two rows through the action endpoint
    const item0 = { ...proposal.items[0], title: "Send the revised report" };
    const item1 = { ...proposal.items[1], title: "Schedule the review" };
    const confirmPayload = {
      action: "confirm",
      revision: proposal.revision ?? 1,
      requestId: randomUUID(),
      items: [
        item0,
        item1,
        proposal.items[2],
        proposal.items[3],
        proposal.items[4],
      ],
      selectedItemIds: [item0.id, item1.id],
    };

    let toolResult: unknown;
    let resumedToolCallId: unknown;
    completion.mockImplementationOnce(async ({ messages }) => {
      const last = messages.at(-1);
      resumedToolCallId = last.tool_call_id;
      toolResult = JSON.parse(last.content);
      return streamReply("The two selected tasks were created.");
    });
    const confirmRes = await post(
      `conversations/${conversationId}/proposals/${proposal.id}/actions`,
      confirmPayload,
    );
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.proposal.status).toBe("created");
    expect(confirmRes.body.data.proposal.createdTasks).toHaveLength(2);

    // Replay confirm with same requestId
    const replayRes = await post(
      `conversations/${conversationId}/proposals/${proposal.id}/actions`,
      confirmPayload,
    );
    expect(replayRes.status).toBe(200);

    const continuationRun = confirmRes.body.data.continuation;
    expect(continuationRun?.turnId).toBeDefined();
    expect(replayRes.body.data.continuation.turnId).toBe(
      continuationRun.turnId,
    );
    await expect
      .poll(async () => {
        const { body } = await get(
          `conversations/${conversationId}/turns/${continuationRun.turnId}`,
        );
        return body.data?.status;
      })
      .toBe("completed");
    expect(completion).toHaveBeenCalledTimes(providerCallsBeforeConfirm + 1);
    expect(resumedToolCallId).toBe(toolCallId);
    expect(toolResult).toEqual({
      status: "created",
      proposalId: proposal.id,
      createdTasks: confirmRes.body.data.proposal.createdTasks,
    });
    const transcript = await get(`conversations/${conversationId}`);
    expect(
      transcript.body.data.messages.map(
        (message: { text: string }) => message.text,
      ),
    ).toContain("The two selected tasks were created.");
    expect(
      transcript.body.data.messages.filter(
        (message: { sender: string }) => message.sender === "user",
      ),
    ).toHaveLength(1);

    // 3. Inspect system message on the next chat request
    let nextSystemMessage = "";
    completion.mockImplementationOnce(async ({ messages }) => {
      const sys = messages.find((m: { role: string }) => m.role === "system");
      nextSystemMessage = sys?.content ?? "";
      return answer("Here are the tasks you confirmed");
    });

    const nextTurn = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "What did I confirm?",
      mode: "auto",
    });
    expect(nextTurn.body.status).toBe("completed");
    expect(nextSystemMessage).toContain(
      "Confirmed task proposals (server data):",
    );
    expect(nextSystemMessage).toContain("Send the revised report");
    expect(nextSystemMessage).toContain("Schedule the review");
    expect(nextSystemMessage).not.toContain("Task from failed confirmation");

    // 4. Exercise a rejected confirmation and verify its title does not enter model context
    const secondProposalTurn = await TaskProposal.create({
      userId: users[0],
      conversationId,
      turnId: randomUUID(),
      proposalId: "failed-prop",
      status: "draft",
      createdTasks: [],
    });
    // Failed write
    const failedConfirmRes = await post(
      `conversations/${conversationId}/proposals/${secondProposalTurn.proposalId}/actions`,
      {
        action: "confirm",
        requestId: randomUUID(),
        items: [{ id: "fail-item", title: "Task from failed confirmation" }],
        selectedItemIds: ["non-existent-id"],
      },
    );
    expect(failedConfirmRes.status).toBe(400);

    // Verify next turn still does not contain "Task from failed confirmation"
    let followingSystemMessage = "";
    completion.mockImplementationOnce(async ({ messages }) => {
      const sys = messages.find((m: { role: string }) => m.role === "system");
      followingSystemMessage = sys?.content ?? "";
      return answer("Follow up response");
    });
    await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Follow up",
      mode: "auto",
    });
    expect(followingSystemMessage).not.toContain(
      "Task from failed confirmation",
    );

    const question = "How should we continue after the revised report?";
    const preference = "Focus the next steps on review feedback.";
    completion.mockResolvedValueOnce(
      tool("grill_user", {
        question,
        options: [
          { id: "feedback", label: "Review feedback", description: preference },
          { id: "schedule", label: "Adjust the schedule" },
        ],
      }),
    );
    const followUpMenu = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Ask what to focus on before drafting next steps",
      mode: "ask",
    });
    expect(followUpMenu.body.interaction.question).toBe(question);

    let continuationContext = "";
    completion.mockImplementationOnce(async ({ messages }) => {
      continuationContext =
        messages.find((message: { role: string }) => message.role === "system")
          ?.content ?? "";
      return tool("propose_tasks", {
        items: [{ title: "Collect review feedback" }],
      });
    });
    const continuation = await post(
      "chat-mcp",
      choose(
        conversationId,
        followUpMenu.body.interaction,
        { optionId: "feedback" },
        "Review feedback",
      ),
    );
    expect(
      continuation.body.proposal.items.map(
        (item: { title: string }) => item.title,
      ),
    ).toEqual(["Collect review feedback"]);
    expect(continuationContext).toContain(
      "Answered clarification (server data):",
    );
    expect(continuationContext).toContain(question);
    expect(continuationContext).toContain(preference);
    expect(continuationContext).toContain(
      confirmRes.body.data.proposal.createdTasks[0].taskId,
    );
    expect(continuationContext).toContain(
      "Use confirmed tasks as existing work when drafting follow-up plans",
    );
  });

  it("persists interactive surfaces, injects up to 3 scoped action receipts into later turns, and handles runtime flag-off fallback", async () => {
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "true");
    vi.stubEnv("A2UI_INTERACTIVE_ENABLED", "true");
    const conversationId = await create();
    const otherConversationId = await create();
    const foreignConversationId = randomUUID();
    expect(
      (
        await post(
          "conversations",
          { conversationId: foreignConversationId },
          1,
        )
      ).status,
    ).toBe(201);

    const [user0Category, user1Category] = await Promise.all([
      Category.findOne({ userId: users[0], name: "Uncategorized" }).lean(),
      Category.findOne({ userId: users[1], name: "Uncategorized" }).lean(),
    ]);
    expect(user0Category?._id).toBeTruthy();
    expect(user1Category?._id).toBeTruthy();

    const ownedTasks = await Task.create([
      {
        categoryId: user0Category!._id,
        title: "First milestone task",
        status: "in-progress",
        priority: "High",
      },
      {
        categoryId: user0Category!._id,
        title: "Second milestone task",
        status: "in-progress",
        priority: "Medium",
      },
      {
        categoryId: user0Category!._id,
        title: "Third milestone task",
        status: "in-progress",
        priority: "Low",
      },
      {
        categoryId: user0Category!._id,
        title: "Fourth milestone task",
        status: "in-progress",
        priority: "Low",
      },
      {
        categoryId: user0Category!._id,
        title: "Other conversation task",
        status: "in-progress",
        priority: "Low",
      },
      {
        categoryId: user1Category!._id,
        title: "Foreign user secret task",
        status: "in-progress",
        priority: "Low",
      },
    ]);

    const makeInteractiveSpec = (taskIds: string[], fallbackText: string) => ({
      companionText: "Tap below when done.",
      fallbackText,
      components: [
        {
          id: "root",
          component: "Column",
          children: taskIds.map((_, idx) => `btn_${idx}`),
          gap: "sm",
        },
        ...taskIds.map((_, idx) => ({
          id: `btn_${idx}`,
          component: "Button",
          label: `Complete ${idx}`,
          actionKey: `act_${idx}`,
        })),
      ],
      displayData: {},
      actions: Object.fromEntries(
        taskIds.map((id, idx) => [
          `act_${idx}`,
          { name: "task.complete", taskId: id },
        ]),
      ),
    });

    // 1. Present 4 actions in primary conversation, 1 in other conversation, 1 in foreign user's conversation
    completion
      .mockResolvedValueOnce(tool("load_skill", { skillId: "ui-composition" }))
      .mockResolvedValueOnce(
        tool(
          "present_interactive_ui",
          makeInteractiveSpec(
            ownedTasks.slice(0, 4).map((t) => String(t._id)),
            "Fallback interactive summary",
          ),
        ),
      );
    const turnRes = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "Show my four milestone tasks",
      mode: "auto",
    });
    expect(turnRes.status).toBe(200);
    expect(turnRes.body.turnId).toBeTruthy();
    expect(turnRes.body.surface?.a2ui?.catalogId).toBe(
      "urn:orbit:a2ui:interactive:v1",
    );
    expect(turnRes.body.actionBindings).toHaveLength(4);

    // Other conversation for same user
    completion
      .mockResolvedValueOnce(tool("load_skill", { skillId: "ui-composition" }))
      .mockResolvedValueOnce(
        tool(
          "present_interactive_ui",
          makeInteractiveSpec(
            [String(ownedTasks[4]._id)],
            "Other conversation fallback",
          ),
        ),
      );
    const otherTurnRes = await post("chat-mcp", {
      conversationId: otherConversationId,
      requestId: randomUUID(),
      userInput: "Show other conversation task",
      mode: "auto",
    });
    expect(otherTurnRes.status).toBe(200);

    // Foreign user conversation
    completion
      .mockResolvedValueOnce(tool("load_skill", { skillId: "ui-composition" }))
      .mockResolvedValueOnce(
        tool(
          "present_interactive_ui",
          makeInteractiveSpec(
            [String(ownedTasks[5]._id)],
            "Foreign user fallback",
          ),
        ),
      );
    const foreignTurnRes = await post(
      "chat-mcp",
      {
        conversationId: foreignConversationId,
        requestId: randomUUID(),
        userInput: "Show foreign task",
        mode: "auto",
      },
      1,
    );
    expect(foreignTurnRes.status).toBe(200);

    // 2. Commit 4 actions in primary conversation, 1 in other conversation, 1 in foreign conversation, plus 1 invalid/uncommitted attempt
    for (const binding of turnRes.body.actionBindings) {
      const actRes = await post(
        `conversations/${conversationId}/turns/${turnRes.body.turnId}/surfaces/${turnRes.body.surface.a2ui.surfaceId}/actions`,
        { requestId: randomUUID(), actionId: binding.id },
      );
      expect(actRes.status).toBe(200);
    }
    const uncommittedRes = await post(
      `conversations/${conversationId}/turns/${turnRes.body.turnId}/surfaces/${turnRes.body.surface.a2ui.surfaceId}/actions`,
      { requestId: randomUUID(), actionId: randomUUID() },
    );
    expect(uncommittedRes.status).toBe(404);

    await post(
      `conversations/${otherConversationId}/turns/${otherTurnRes.body.turnId}/surfaces/${otherTurnRes.body.surface.a2ui.surfaceId}/actions`,
      {
        requestId: randomUUID(),
        actionId: otherTurnRes.body.actionBindings[0].id,
      },
    );
    await post(
      `conversations/${foreignConversationId}/turns/${foreignTurnRes.body.turnId}/surfaces/${foreignTurnRes.body.surface.a2ui.surfaceId}/actions`,
      {
        requestId: randomUUID(),
        actionId: foreignTurnRes.body.actionBindings[0].id,
      },
      1,
    );

    // 3. Reload conversation: capabilities include interactiveUi and uiActions; bounded outcomes attached
    const reloadRes = await get(`conversations/${conversationId}`);
    expect(reloadRes.status).toBe(200);
    expect(reloadRes.body.data.capabilities).toEqual({
      taskProposals: false,
      interactiveUi: true,
      uiActions: ["task.complete"],
    });
    expect(reloadRes.body.data.messages[1].uiActionOutcomes).toHaveLength(3);

    // 4. Next turn in primary conversation: provider system prompt contains the latest 3 receipts ONLY, title labelled as data, and requires fresh reads
    let nextSystemMessage = "";
    completion.mockImplementationOnce(async ({ messages }) => {
      nextSystemMessage =
        messages.find((m: { role: string }) => m.role === "system")?.content ??
        "";
      return answer("Acknowledged completed actions.");
    });
    const nextTurnRes = await post("chat-mcp", {
      conversationId,
      requestId: randomUUID(),
      userInput: "What tasks were just completed?",
      mode: "auto",
    });
    expect(nextTurnRes.status).toBe(200);
    expect(nextSystemMessage).toContain(
      "Recent UI action outcomes (server data",
    );
    expect(nextSystemMessage).toContain("Fourth milestone task");
    expect(nextSystemMessage).toContain("Third milestone task");
    expect(nextSystemMessage).toContain("Second milestone task");
    expect(nextSystemMessage).not.toContain("First milestone task");
    expect(nextSystemMessage).not.toContain("Other conversation task");
    expect(nextSystemMessage).not.toContain("Foreign user secret task");
    expect(nextSystemMessage).toContain("fresh");

    // 5. Runtime flag-off: reload falls back to text and mutation rejects with 409
    vi.stubEnv("A2UI_INTERACTIVE_ENABLED", "false");
    const flagOffReload = await get(`conversations/${conversationId}`);
    expect(flagOffReload.status).toBe(200);
    expect(flagOffReload.body.data.capabilities.interactiveUi).toBe(false);
    expect(flagOffReload.body.data.capabilities.uiActions).toEqual([]);
    expect(flagOffReload.body.data.messages[1].surface).toBeUndefined();
    expect(flagOffReload.body.data.messages[1].text).toBe(
      "Tap below when done.",
    );

    const flagOffAction = await post(
      `conversations/${conversationId}/turns/${turnRes.body.turnId}/surfaces/${turnRes.body.surface.a2ui.surfaceId}/actions`,
      {
        requestId: randomUUID(),
        actionId: turnRes.body.actionBindings[0].id,
      },
    );
    expect(flagOffAction.status).toBe(409);
  });
});
