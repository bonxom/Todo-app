import { beforeEach, expect, it, vi } from "vitest";
const model = vi.hoisted(() => ({
  exists: vi.fn(),
}));
vi.mock("../../models/Attachment.js", () => ({ default: model }));
import { attachmentRepository } from "../attachmentRepository.js";

beforeEach(() => {
  vi.resetAllMocks();
});

it("checks for owned attached images in the current conversation", async () => {
  model.exists.mockResolvedValue({ _id: "img-1" });
  expect(
    await attachmentRepository.hasAttachedImage("owner", "conversation"),
  ).toBe(true);
  expect(model.exists).toHaveBeenCalledWith({
    userId: "owner",
    conversationId: "conversation",
    state: "attached",
    mimeType: { $regex: /^image\// },
  });
});

it("returns false when no attached image exists in the conversation", async () => {
  model.exists.mockResolvedValue(null);
  expect(
    await attachmentRepository.hasAttachedImage("owner", "conversation"),
  ).toBe(false);
});
