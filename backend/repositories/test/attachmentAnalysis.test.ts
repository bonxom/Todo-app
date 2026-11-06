import { expect, it, vi } from "vitest";
const model = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn(),
  updateOne: vi.fn(),
}));
vi.mock("../../models/Attachment.js", () => ({ default: model }));
import { attachmentRepository } from "../attachmentRepository.js";
it("atomically claims only an owned, bound attachment without any previous attempt", async () => {
  model.findOneAndUpdate.mockReturnValue({ lean: async () => null });
  await attachmentRepository.claimAnalysis("owner", "conversation", "image");
  expect(model.findOneAndUpdate).toHaveBeenCalledWith(
    {
      _id: "image",
      userId: "owner",
      conversationId: "conversation",
      state: "attached",
      analysis: { $exists: false },
    },
    {
      $set: { analysis: { status: "processing", updatedAt: expect.any(Date) } },
    },
    { new: true },
  );
});
it("finishes only an owned in-flight analysis", async () => {
  model.updateOne.mockResolvedValue({ matchedCount: 1 });
  expect(
    await attachmentRepository.finishAnalysis(
      "owner",
      "conversation",
      "image",
      { status: "succeeded", description: "frog" },
    ),
  ).toBe(true);
  expect(model.updateOne).toHaveBeenCalledWith(
    {
      _id: "image",
      userId: "owner",
      conversationId: "conversation",
      state: "attached",
      "analysis.status": "processing",
    },
    {
      $set: {
        analysis: {
          status: "succeeded",
          description: "frog",
          updatedAt: expect.any(Date),
        },
      },
    },
  );
});
