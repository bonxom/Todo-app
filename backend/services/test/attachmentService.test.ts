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
const conversations = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../repositories/attachmentRepository.js", () => ({
  attachmentRepository: repo,
}));
vi.mock("../../libs/objectStorage.js", () => ({ objectStorage: storage }));
vi.mock("../../repositories/conversationRepository.js", () => ({
  conversationRepository: conversations,
}));
import { attachmentService } from "../attachmentService.js";
import {
  validateAttachment,
  MAX_ATTACHMENT_BYTES,
} from "../../utils/attachmentFile.js";
import { readStorageConfig } from "../../config/storage.js";
const file = { originalname: "notes.txt", buffer: Buffer.from("hello") };

describe("private attachments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    conversations.get.mockResolvedValue({ _id: "conversation" });
    repo.ready.mockResolvedValue(true);
    storage.put.mockResolvedValue(undefined);
    storage.remove.mockResolvedValue(undefined);
    repo.create.mockImplementation(async (value) => value);
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
    const multerLatin1Name = Buffer.from(vietnameseName, "utf-8").toString("latin1");
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
