import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  chat: vi.fn(),
  turns: vi.fn(),
  finish: vi.fn(),
  checkpoint: vi.fn(),
}));
vi.mock("../attachmentVisionService.js", () => ({
  attachmentVisionService: { context: mocks.context },
}));
vi.mock("../agentService.js", () => ({
  agentService: { chatWithMcp: mocks.chat },
}));
vi.mock("../../repositories/chatTurnRepository.js", () => ({
  chatTurnRepository: {
    turns: mocks.turns,
    finish: mocks.finish,
    checkpoint: mocks.checkpoint,
  },
}));
import { runConversationTurn } from "../conversationTurnService.js";
import type { ChatTurn } from "../../types/IChatTurn.js";
import type { McpContext } from "../../mcp/context.js";
it("resolves bound attachments before calling the text-only chatbot", async () => {
  const attachments = [
    { id: "image", name: "frog.png", size: 3, mimeType: "image/png" },
  ];
  mocks.context.mockResolvedValue("Attachment descriptions: green frog");
  mocks.turns.mockResolvedValue([]);
  mocks.chat.mockResolvedValue("A green frog");
  await runConversationTurn(
    {
      _id: "turn",
      conversationId: "conversation",
      userInput: "Describe",
      attachments,
      messages: [],
      sequence: 1,
      executionToken: "token",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as ChatTurn,
    { user: { _id: "owner" }, requestId: "request" } as unknown as McpContext,
  );
  expect(mocks.context).toHaveBeenCalledWith(
    "owner",
    "conversation",
    attachments,
  );
  expect(mocks.chat).toHaveBeenCalledWith(
    "Describe",
    expect.anything(),
    expect.objectContaining({
      attachmentContext: "Attachment descriptions: green frog",
    }),
  );
});
