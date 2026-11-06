import { afterEach, expect, it, vi } from "vitest";
const create = vi.hoisted(() => vi.fn());
vi.mock("openai", () => ({
  OpenAI: class {
    chat = { completions: { create } };
  },
}));
vi.mock("../../config/env.js", () => ({
  getAiApiKey: () => "test-key",
  getAiBaseUrl: () => "https://example.test",
  getAiModel: () => "vision-default",
}));
import { describeImage } from "../../libs/visionClient.js";
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
it("sends bytes only to a separate vision call and bounds the cached description", async () => {
  vi.stubEnv("VISION_MODEL_NAME", "separate-vision");
  create.mockResolvedValue({
    choices: [
      { finish_reason: "stop", message: { content: "x".repeat(7000) } },
    ],
  });
  const result = await describeImage(
    Buffer.from("image"),
    "image/png",
    AbortSignal.timeout(1000),
  );
  expect(result.description).toHaveLength(6000);
  expect(create.mock.calls[0][0]).toMatchObject({
    model: "separate-vision",
    messages: [
      { role: "system" },
      {
        role: "user",
        content: [
          { type: "text" },
          {
            type: "image_url",
            image_url: { url: "data:image/png;base64,aW1hZ2U=" },
          },
        ],
      },
    ],
  });
  expect(create.mock.calls[0][0]).not.toHaveProperty("tools");
  expect(create.mock.calls[0][1].maxRetries).toBe(0);
});
it("rejects empty vision output", async () => {
  create.mockResolvedValue({
    choices: [{ finish_reason: "stop", message: { content: "" } }],
  });
  await expect(
    describeImage(Buffer.from("image"), "image/png", AbortSignal.timeout(1000)),
  ).rejects.toThrow("Vision response invalid");
});
