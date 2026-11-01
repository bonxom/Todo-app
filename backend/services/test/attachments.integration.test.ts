import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
const completion = vi.hoisted(() => vi.fn());
const objects = new Map<string, Buffer>();
vi.mock("../../libs/aiClient.js", () => ({
  getAiClient: () => ({ chat: { completions: { create: completion } } }),
}));
vi.mock("../../config/env.js", () => ({ getAiModel: () => "test-model" }));
vi.mock("../../libs/objectStorage.js", async (importOriginal) =>
  process.env.ORBIT_TEST_LIVE_STORAGE === "true"
    ? importOriginal()
    : {
        objectStorage: {
          put: async (key: string, data: Buffer) => {
            objects.set(key, data);
          },
          get: async (key: string) => Readable.from(objects.get(key)!),
          remove: async (key: string) => {
            objects.delete(key);
          },
        },
      },
);
import { requestContext } from "../../error/requestContext.js";
import { objectStorage } from "../../libs/objectStorage.js";
import aiRoutes from "../../routes/aiRoutes.js";
import { errorHandler } from "../../error/errorHandler.js";
import User from "../../models/User.js";
import Conversation from "../../models/Conversation.js";
import ChatTurn from "../../models/ChatTurn.js";
import Attachment from "../../models/Attachment.js";
import { attachmentService } from "../attachmentService.js";
const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const users = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const app = express();
app.use(requestContext);
app.use(express.json());
app.use("/api/ai", aiRoutes);
app.use(errorHandler);
const auth = (i = 0) =>
  `Bearer ${jwt.sign({ id: String(users[i]) }, "attachment-test-secret", { expiresIn: "1h" })}`;
const base = (id: string) => `/api/ai/conversations/${id}/attachments`;
const upload = (
  id: string,
  user = 0,
  name = "notes.txt",
  data = Buffer.from("private notes"),
) =>
  request(app)
    .post(base(id))
    .set("Authorization", auth(user))
    .attach("file", data, name);
const send = (body: object, user = 0) =>
  request(app)
    .post("/api/ai/chat-mcp")
    .set("Authorization", auth(user))
    .send(body);
const read = (path: string, user = 0) =>
  request(app).get(path).set("Authorization", auth(user));
async function conversation() {
  const id = randomUUID();
  await Conversation.create({ _id: id, userId: users[0] });
  return id;
}
describe.skipIf(!uri)("chat attachments HTTP + Mongo transactions", () => {
  beforeAll(async () => {
    if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(uri))
      throw new Error("Use disposable loopback MongoDB");
    vi.stubEnv("JWT_SECRET", "attachment-test-secret");
    await mongoose.connect(uri, {
      dbName: `attachments_test_${process.pid}_${Date.now()}`,
    });
    await User.collection.insertMany(
      users.map((_id, i) => ({
        _id,
        name: `user ${i}`,
        role: "USER",
        email: `${i}@test.example`,
      })),
    );
    await Promise.all([
      Conversation.init(),
      ChatTurn.init(),
      Attachment.init(),
    ]);
  });
  beforeEach(() => {
    completion.mockReset();
    completion.mockResolvedValue({
      choices: [{ message: { role: "assistant", content: "Saved." } }],
    });
  });
  afterAll(async () => {
    for (const item of await Attachment.find().lean())
      await objectStorage.remove(item.objectKey);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    vi.unstubAllEnvs();
  });
  it("uploads, binds, restores and privately downloads exact bytes; retries are idempotent", async () => {
    const id = await conversation();
    const uploaded = await upload(id);
    expect(uploaded.status).toBe(201);
    const file = uploaded.body.data;
    const payload = {
      conversationId: id,
      requestId: randomUUID(),
      userInput: "Keep these notes",
      attachmentIds: [file.id],
    };
    const sent = await send(payload);
    expect(sent.status).toBe(200);
    const history = await read(`/api/ai/conversations/${id}`);
    expect(history.body.data.messages[0].attachments).toEqual([file]);
    expect(JSON.stringify(history.body)).not.toContain("objectKey");
    expect((await Attachment.findById(file.id))?.state).toBe("attached");
    const downloaded = await read(`${base(id)}/${file.id}`);
    expect(downloaded.text).toBe("private notes");
    expect(downloaded.headers["content-disposition"]).toMatch(/^attachment/);
    expect(downloaded.headers["cache-control"]).toBe("no-store");
    expect((await send(payload)).body).toEqual(sent.body);
    expect(completion).toHaveBeenCalledTimes(1);
    expect((await send({ ...payload, attachmentIds: [] })).status).toBe(409);
    expect((await send({ ...payload, requestId: randomUUID() })).status).toBe(
      404,
    );
    expect(
      (
        await request(app)
          .delete(`${base(id)}/${file.id}`)
          .set("Authorization", auth())
      ).status,
    ).toBe(404);
  });
  it("rejects anonymous, foreign owner, foreign conversation and invalid uploads", async () => {
    const id = await conversation();
    const other = await conversation();
    expect(
      (
        await request(app)
          .post(base(id))
          .attach("file", Buffer.from("private"), "x.txt")
      ).status,
    ).toBe(401);
    expect((await upload(id, 1)).status).toBe(404);
    const file = (await upload(id)).body.data;
    expect((await read(`${base(id)}/${file.id}`, 1)).status).toBe(404);
    expect((await read(`${base(other)}/${file.id}`)).status).toBe(404);
    expect((await request(app).get(`${base(id)}/${file.id}`)).status).toBe(401);
    expect(
      (
        await send({
          conversationId: other,
          requestId: randomUUID(),
          userInput: "Wrong conversation",
          attachmentIds: [file.id],
        })
      ).status,
    ).toBe(404);
    for (const name of ["fake.png", "file.html", "file.svg"])
      expect((await upload(id, 0, name)).status).toBe(400);
    expect(
      (await upload(id, 0, "large.txt", Buffer.alloc(10 * 1024 * 1024 + 1, 65)))
        .status,
    ).toBe(413);
  });
  it("validates IDs and preserves uploaded state when a multi-file claim fails", async () => {
    const id = await conversation();
    const file = (await upload(id)).body.data;
    const payload = {
      conversationId: id,
      requestId: randomUUID(),
      userInput: "Files",
      attachmentIds: [file.id, randomUUID()],
    };
    expect((await send(payload)).status).toBe(404);
    expect((await Attachment.findById(file.id))?.state).toBe("uploaded");
    expect(
      (await send({ ...payload, attachmentIds: [file.id, file.id] })).status,
    ).toBe(400);
    expect(
      (
        await send({
          ...payload,
          attachmentIds: Array.from({ length: 5 }, () => randomUUID()),
        })
      ).status,
    ).toBe(400);
  });
  it("keeps files after provider failure and cleans only stale unused uploads", async () => {
    const id = await conversation();
    const file = (await upload(id)).body.data;
    completion.mockRejectedValue(new Error("provider unavailable"));
    const sent = await send({
      conversationId: id,
      requestId: randomUUID(),
      userInput: "Keep this",
      attachmentIds: [file.id],
    });
    expect(sent.body.status).toBe("failed");
    const unused = (await upload(id)).body.data;
    await Attachment.collection.updateMany(
      {},
      { $set: { createdAt: new Date(0) } },
    );
    await attachmentService.cleanup();
    expect(await Attachment.findById(unused.id)).toBeNull();
    expect((await read(`${base(id)}/${file.id}`)).status).toBe(200);
    expect(
      (await read(`/api/ai/conversations/${id}`)).body.data.messages[0]
        .attachments,
    ).toEqual([file]);
  });
  it("restores attachment IDs for an in-flight turn and paginated metadata", async () => {
    const id = await conversation();
    const file = (await upload(id)).body.data;
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
    const payload = {
      conversationId: id,
      requestId: randomUUID(),
      userInput: "Keep pending file",
      attachmentIds: [file.id],
    };
    const active = send(payload).then((result) => result);
    await started;
    try {
      const snapshot = (await read(`/api/ai/conversations/${id}`)).body.data;
      expect(snapshot.pending[0].attachmentIds).toEqual([file.id]);
      expect(snapshot.messages[0].attachments).toEqual([file]);
    } finally {
      release({
        choices: [{ message: { role: "assistant", content: "Saved." } }],
      });
      await active;
    }
    await ChatTurn.insertMany(
      Array.from({ length: 51 }, (_, i) => ({
        _id: randomUUID(),
        userId: users[0],
        conversationId: id,
        requestId: randomUUID(),
        sequence: i + 2,
        userInput: "Later",
        status: "completed",
        response: "OK",
        expiresAt: new Date(),
        createdAt: new Date(),
      })),
    );
    const firstPage = (await read(`/api/ai/conversations/${id}`)).body.data;
    const earlier = (
      await read(`/api/ai/conversations/${id}?before=${firstPage.before}`)
    ).body.data;
    expect(earlier.messages[0].attachments).toEqual([file]);
  });
  it("never deletes a file successfully bound during concurrent stale cleanup", async () => {
    const id = await conversation();
    const file = (await upload(id)).body.data;
    await Attachment.collection.updateOne(
      { _id: file.id },
      { $set: { createdAt: new Date(0) } },
    );
    const [sent] = await Promise.all([
      send({
        conversationId: id,
        requestId: randomUUID(),
        userInput: "Race",
        attachmentIds: [file.id],
      }),
      attachmentService.cleanup(),
    ]);
    if (sent.status === 200) {
      expect((await read(`${base(id)}/${file.id}`)).status).toBe(200);
      expect((await Attachment.findById(file.id))?.state).toBe("attached");
    } else {
      expect(sent.status).toBe(404);
      expect(await ChatTurn.countDocuments({ conversationId: id })).toBe(0);
    }
  });
  it("serves verified raster images inline and rejects multipart fields or extra files", async () => {
    const id = await conversation();
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    );
    const uploaded = await upload(id, 0, "photo.png", png);
    expect(uploaded.status).toBe(201);
    const response = await read(`${base(id)}/${uploaded.body.data.id}`);
    expect(response.body).toEqual(png);
    expect(response.headers["content-disposition"]).toMatch(/^inline/);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(
      (
        await request(app)
          .post(base(id))
          .set("Authorization", auth())
          .field("objectKey", "other/key")
          .attach("file", png, "photo.png")
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(base(id))
          .set("Authorization", auth())
          .attach("file", png, "one.png")
          .attach("file", png, "two.png")
      ).status,
    ).toBe(400);
  });
  it("returns a client error for malformed multipart bodies", async () => {
    const id = await conversation();
    const response = await request(app)
      .post(base(id))
      .set("Authorization", auth())
      .set("Content-Type", "multipart/form-data")
      .send("missing boundary");
    expect(response.status).toBe(400);
  });
});
