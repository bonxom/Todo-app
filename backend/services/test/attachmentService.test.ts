import { beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
const repo = vi.hoisted(() => ({
  create: vi.fn(),
  ready: vi.fn(),
  get: vi.fn(),
  claimUnused: vi.fn(),
  delete: vi.fn(),
  bind: vi.fn(),
  stale: vi.fn(),
}));
const storage = vi.hoisted(() => ({
  put: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
}));
const vision = vi.hoisted(() => vi.fn());
vi.mock("../../libs/visionClient.js", () => ({ describeImage: vision }));
const conversations = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../repositories/attachmentRepository.js", () => ({
  attachmentRepository: repo,
}));
vi.mock("../../libs/objectStorage.js", () => ({ objectStorage: storage }));
vi.mock("../../repositories/conversationRepository.js", () => ({
  conversationRepository: conversations,
}));
import { attachmentVisionService } from "../attachmentVisionService.js";
import { attachmentService } from "../attachmentService.js";
import {
  validateAttachment,
  MAX_ATTACHMENT_BYTES,
} from "../../utils/attachmentFile.js";
import { readStorageConfig } from "../../config/storage.js";
const file = { originalname: "notes.txt", buffer: Buffer.from("hello") };

const image = {
  originalname: "photo.png",
  buffer: Buffer.from("89504e470d0a1a0a00000000", "hex"),
};
describe("private attachments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    conversations.get.mockResolvedValue({ _id: "conversation" });
    repo.ready.mockResolvedValue(true);
    storage.put.mockResolvedValue(undefined);
    storage.remove.mockResolvedValue(undefined);
    repo.create.mockImplementation(async (value) => value);
  });
  it.each(["unconfigured", "down", "pending"])(
    "uses direct vision and cached chat context when storage is %s",
    async (mode) => {
      vision.mockImplementation(async (bytes, mime) => {
        expect(bytes).toEqual(image.buffer);
        expect(mime).toBe("image/png");
        expect(storage.put).not.toHaveBeenCalled();
        return { description: "A blue cup", model: "vision" };
      });
      storage.put.mockImplementation(() =>
        mode === "pending"
          ? new Promise(() => {})
          : Promise.reject(new Error(mode)),
      );
      const uploaded = await attachmentService.upload(
        "user",
        "conversation",
        image,
      );
      const record = repo.create.mock.calls[0][0];
      repo.get.mockResolvedValue({ ...record, state: "attached" });
      expect(
        await attachmentVisionService.context("user", "conversation", [
          uploaded,
        ]),
      ).toContain("A blue cup");
      expect(vision).toHaveBeenCalledTimes(1);
      expect(vision).toHaveBeenCalledWith(
        image.buffer,
        "image/png",
        expect.any(AbortSignal),
      );
      expect(vision.mock.invocationCallOrder[0]).toBeLessThan(
        storage.put.mock.invocationCallOrder[0],
      );
      expect(storage.get).not.toHaveBeenCalled();
      expect(repo.claimUnused).not.toHaveBeenCalled();
      expect(storage.put).toHaveBeenCalledWith(
        record.objectKey,
        image.buffer,
        "image/png",
      );
    },
  );
  it("rejects unauthorized and invalid images before calling vision", async () => {
    conversations.get.mockRejectedValueOnce(new Error("not found"));
    await expect(
      attachmentService.upload("user", "other", image),
    ).rejects.toThrow("not found");
    await expect(
      attachmentService.upload("user", "conversation", {
        ...image,
        buffer: Buffer.from("invalid"),
      }),
    ).rejects.toThrow();
    expect(vision).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });
  it("retains explicit failed vision analysis and still stores the image", async () => {
    vision.mockRejectedValue(new Error("vision down"));
    const uploaded = await attachmentService.upload(
      "user",
      "conversation",
      image,
    );
    const record = repo.create.mock.calls[0][0];
    expect(record.analysis.status).toBe("failed");
    repo.get.mockResolvedValue({ ...record, state: "attached" });
    expect(
      await attachmentVisionService.context("user", "conversation", [uploaded]),
    ).toContain('"status":"failed"');
    expect(storage.put).toHaveBeenCalled();
  });
  it("does not store image bytes when persistence fails", async () => {
    vision.mockResolvedValue({ description: "A cup", model: "vision" });
    repo.ready.mockResolvedValue(false);
    await expect(
      attachmentService.upload("user", "conversation", image),
    ).rejects.toThrow();
    expect(storage.put).not.toHaveBeenCalled();
  });
  it("allows disabled storage and supports LAN, localhost and Docker endpoints", () => {
    expect(readStorageConfig({})).toBeNull();
    for (const endpoint of [
      "http://192.168.1.17:9000",
      "http://127.0.0.1:9000",
      "http://minio:9000",
    ])
      expect(
        readStorageConfig({
          MINIO_ENDPOINT: endpoint,
          MINIO_ACCESS_KEY: "test",
          MINIO_SECRET_KEY: "test",
          MINIO_BUCKET: "todoapp-chat",
        })?.endpoint,
      ).toBe(endpoint);
    expect(() =>
      readStorageConfig({ MINIO_ENDPOINT: "http://minio:9000" }),
    ).toThrow();
    expect(() => readStorageConfig({ MINIO_ACCESS_KEY: "test" })).toThrow();
  });
  it("validates bytes rather than trusting MIME headers and sanitizes names", () => {
    expect(validateAttachment(file)).toEqual({
      name: "notes.txt",
      mimeType: "text/plain",
      size: 5,
    });
    expect(
      validateAttachment({ ...file, originalname: "../notes.txt" }).name,
    ).toBe("notes.txt");
    const vietnameseName = "IT3120 Phân tích và thiết.txt";
    const multerLatin1Name = Buffer.from(vietnameseName, "utf-8").toString(
      "latin1",
    );
    expect(
      validateAttachment({
        ...file,
        originalname: multerLatin1Name,
      }).name,
    ).toBe(vietnameseName);
    expect(
      validateAttachment({
        ...file,
        originalname: vietnameseName,
      }).name,
    ).toBe(vietnameseName);
    for (const bad of [
      { originalname: "fake.png", buffer: Buffer.from("not an image") },
      { originalname: "script.svg", buffer: Buffer.from("<svg/>") },
      { originalname: "file.html", buffer: Buffer.from("<html/>") },
      { originalname: "empty.txt", buffer: Buffer.alloc(0) },
      { originalname: "binary.txt", buffer: Buffer.from([0xff, 0x00]) },
      {
        originalname: "big.txt",
        buffer: Buffer.alloc(MAX_ATTACHMENT_BYTES + 1),
      },
    ])
      expect(() => validateAttachment(bad)).toThrow();
  });
  it("checks conversation ownership before storage I/O", async () => {
    conversations.get.mockRejectedValue(new Error("not found"));
    await expect(
      attachmentService.upload("user", "other", file),
    ).rejects.toThrow("not found");
    expect(storage.put).not.toHaveBeenCalled();
  });
  it("returns only safe metadata and creates staging before writing bytes", async () => {
    storage.put.mockImplementation(async () => {
      expect(repo.create).toHaveBeenCalled();
    });
    const result = await attachmentService.upload("user", "conversation", file);
    expect(result).toEqual({
      id: expect.any(String),
      name: "notes.txt",
      mimeType: "text/plain",
      size: 5,
    });
    expect(JSON.stringify(result)).not.toContain("objectKey");
    expect(repo.ready).toHaveBeenCalledWith(result.id);
  });
  it("compensates storage failure and retains retryable cleanup on deletion failure", async () => {
    storage.put.mockRejectedValue(new Error("storage down"));
    repo.claimUnused.mockResolvedValue({ _id: "id", objectKey: "key" });
    storage.remove.mockRejectedValue(new Error("still down"));
    await expect(
      attachmentService.upload("user", "conversation", file),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(repo.delete).not.toHaveBeenCalled();
  });
  it("rejects a download outside its owner and conversation without reading storage", async () => {
    repo.get.mockResolvedValue(null);
    await expect(
      attachmentService.download("other", "conversation", "id"),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.get).toHaveBeenCalledWith("other", "conversation", "id");
    expect(storage.get).not.toHaveBeenCalled();
  });
  it("streams private bytes after authorization", async () => {
    const stream = Readable.from("hello");
    repo.get.mockResolvedValue({
      _id: "id",
      ...validateAttachment(file),
      objectKey: "private/key",
      state: "attached",
    });
    storage.get.mockResolvedValue(stream);
    expect(
      (await attachmentService.download("user", "conversation", "id")).stream,
    ).toBe(stream);
  });
  it("cannot remove an attached upload", async () => {
    repo.claimUnused.mockResolvedValue(null);
    await expect(
      attachmentService.removeUnused("user", "conversation", "id"),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
