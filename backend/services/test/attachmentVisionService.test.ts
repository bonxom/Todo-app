import { beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  claim: vi.fn(),
  finish: vi.fn(),
  storage: vi.fn(),
  describe: vi.fn(),
}));
vi.mock("../../repositories/attachmentRepository.js", () => ({
  attachmentRepository: {
    get: mocks.get,
    claimAnalysis: mocks.claim,
    finishAnalysis: mocks.finish,
  },
}));
vi.mock("../../libs/objectStorage.js", () => ({
  objectStorage: { get: mocks.storage },
}));
vi.mock("../../libs/visionClient.js", () => ({
  describeImage: mocks.describe,
}));
import { attachmentVisionService } from "../attachmentVisionService.js";
const file = { id: "image", name: "frog.png", mimeType: "image/png", size: 3 };
const record = {
  _id: "image",
  state: "attached",
  objectKey: "private-key",
  mimeType: "image/png",
  size: 3,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockResolvedValue(record);
  mocks.claim.mockResolvedValue(record);
  mocks.finish.mockResolvedValue(true);
  mocks.storage.mockImplementation(async () =>
    Readable.from([Buffer.from("png")]),
  );
  mocks.describe.mockResolvedValue({
    description: "Green frog wearing a blue shirt",
    model: "vision-test",
  });
});
describe("cached attachment vision", () => {
  it("allows only one concurrent analysis winner", async () => {
    mocks.claim.mockResolvedValueOnce(record).mockResolvedValueOnce(null);
    const results = await Promise.all([
      attachmentVisionService.context("owner", "conversation", [file]),
      attachmentVisionService.context("owner", "conversation", [file]),
    ]);
    expect(mocks.describe).toHaveBeenCalledTimes(1);
    expect(results.some((result) => result.includes("Green frog"))).toBe(true);
  });

  it("does not expose success if its description could not be persisted", async () => {
    mocks.finish.mockRejectedValue(new Error("database unavailable"));
    expect(
      await attachmentVisionService.context("owner", "conversation", [file]),
    ).toContain("failed");
    expect(mocks.describe).toHaveBeenCalledTimes(1);
  });

  it("analyzes once then reuses persisted text without fetching bytes", async () => {
    const first = await attachmentVisionService.context(
      "owner",
      "conversation",
      [file],
    );
    expect(first).toContain("Green frog");
    expect(first).not.toContain("base64");
    expect(mocks.claim).toHaveBeenCalledWith("owner", "conversation", "image");
    expect(mocks.finish).toHaveBeenCalledWith(
      "owner",
      "conversation",
      "image",
      expect.objectContaining({
        status: "succeeded",
        description: "Green frog wearing a blue shirt",
      }),
    );
    mocks.get.mockResolvedValue({
      ...record,
      analysis: {
        status: "succeeded",
        description: "Green frog wearing a blue shirt",
      },
    });
    await attachmentVisionService.context("owner", "conversation", [file]);
    expect(mocks.describe).toHaveBeenCalledTimes(1);
    expect(mocks.storage).toHaveBeenCalledTimes(1);
  });
  it("does not call vision when another worker claimed analysis", async () => {
    mocks.claim.mockResolvedValue(null);
    const result = await attachmentVisionService.context(
      "owner",
      "conversation",
      [file],
    );
    expect(result).toContain("unavailable");
    expect(mocks.describe).not.toHaveBeenCalled();
  });
  it("caches failures and does not resend the image on retry", async () => {
    mocks.describe.mockRejectedValue(new Error("secret provider error"));
    expect(
      await attachmentVisionService.context("owner", "conversation", [file]),
    ).toContain("failed");
    expect(mocks.finish).toHaveBeenCalledWith(
      "owner",
      "conversation",
      "image",
      expect.objectContaining({ status: "failed" }),
    );
    mocks.get.mockResolvedValue({ ...record, analysis: { status: "failed" } });
    expect(
      await attachmentVisionService.context("owner", "conversation", [file]),
    ).not.toContain("secret");
    expect(mocks.describe).toHaveBeenCalledTimes(1);
  });
  it("does not access another owner's attachment or unbound upload", async () => {
    mocks.get.mockResolvedValue(null);
    await attachmentVisionService.context("other", "conversation", [file]);
    mocks.get.mockResolvedValue({ ...record, state: "uploaded" });
    await attachmentVisionService.context("owner", "conversation", [file]);
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(mocks.storage).not.toHaveBeenCalled();
  });
  it("marks documents as unsupported and never invokes vision", async () => {
    expect(
      await attachmentVisionService.context("owner", "conversation", [
        { ...file, mimeType: "application/pdf" },
      ]),
    ).toContain("unsupported");
    expect(mocks.describe).not.toHaveBeenCalled();
  });
  it("refuses oversized storage streams before provider invocation", async () => {
    mocks.storage.mockResolvedValue(
      Readable.from([Buffer.alloc(10 * 1024 * 1024 + 1)]),
    );
    expect(
      await attachmentVisionService.context("owner", "conversation", [file]),
    ).toContain("failed");
    expect(mocks.describe).not.toHaveBeenCalled();
  });
});
