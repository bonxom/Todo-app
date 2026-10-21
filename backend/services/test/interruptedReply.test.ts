import { describe, expect, it, vi } from "vitest";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { ChatTurn } from "../../types/IChatTurn.js";
import { interruptedReply } from "../../utils/interruptedReply.js";
import { resultFor, turnMessages } from "../../utils/conversationView.js";
import { INTERRUPTED_REPLY } from "../../constants/agent.js";

const { chat, finish, checkpoint } = vi.hoisted(() => ({
  chat: vi.fn(), finish: vi.fn(), checkpoint: vi.fn(),
}));
vi.mock("../agentService.js", () => ({ agentService: { chatWithMcp: chat } }));
vi.mock("../../repositories/chatTurnRepository.js", () => ({
  chatTurnRepository: { turns: async () => [], checkpoint, finish },
}));
import { runConversationTurn } from "../conversationTurnService.js";

function transcript(name = "orbit_create_task", result: unknown = {
  structuredContent: { task: { id: "task-1", title: "Học tiếng Anh" } },
}): ChatCompletionMessageParam[] {
  return [
    { role: "assistant", content: null, tool_calls: [
      { id: "call-1", type: "function", function: { name, arguments: "{}" } },
    ] },
    { role: "tool", tool_call_id: "call-1", content: JSON.stringify(result) },
  ];
}
const expiredTurn = (messages: ChatCompletionMessageParam[]) => ({
  _id: "turn-1", conversationId: "conversation-1", requestId: "request-1",
  status: "processing", response: "", interactions: [], messages,
  expiresAt: new Date(0), createdAt: new Date(0), updatedAt: new Date(0),
} as unknown as ChatTurn);

describe("interrupted reply", () => {
  it("reports successful creates and updates from tool results", () => {
    expect(interruptedReply(transcript())).toContain("Đã tạo công việc: Học tiếng Anh");
    expect(interruptedReply(transcript("orbit_update_task"))).toContain("Đã cập nhật công việc");
  });
  it("does not treat reads, errors, menu acknowledgements or missing results as writes", () => {
    expect(interruptedReply(transcript("orbit_get_task"))).toBe(INTERRUPTED_REPLY);
    expect(interruptedReply(transcript("orbit_create_task", { isError: true }))).toBe(INTERRUPTED_REPLY);
    expect(interruptedReply(transcript("orbit_create_task", { status: "question_displayed", executed: false }))).toBe(INTERRUPTED_REPLY);
    expect(interruptedReply(transcript().slice(0, 1))).toBe(INTERRUPTED_REPLY);
    const broken = transcript();
    broken[1] = { role: "tool", tool_call_id: "call-1", content: '{"structuredContent":' };
    expect(interruptedReply(broken)).toBe(INTERRUPTED_REPLY);
  });
  it("separates confirmed writes from remaining uncertain operations", () => {
    const messages = transcript();
    messages.push({ role: "assistant", content: null, tool_calls: [
      { id: "call-2", type: "function", function: { name: "orbit_update_task", arguments: "{}" } },
    ] });
    expect(interruptedReply(messages)).toContain("Đã tạo công việc");
    expect(interruptedReply(messages)).toContain("Các thao tác còn lại chưa được xác nhận");
  });
  it("restores the same confirmed outcome for expired retries and history", () => {
    const turn = expiredTurn(transcript());
    expect(resultFor(turn).data).toBe(interruptedReply(turn.messages));
    expect(turnMessages(turn).at(-1)?.text).toBe(resultFor(turn).data);
  });
  it("persists a truthful fallback when the provider fails after a successful write", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = transcript();
    chat.mockImplementationOnce(async (_input, _context, memory) => {
      await memory.checkpoint(messages);
      throw new Error("provider unavailable");
    });
    const turn = { ...expiredTurn([]), expiresAt: new Date(Date.now() + 60000), executionToken: "token" };
    try {
      const result = await runConversationTurn(turn, { user: { _id: "user-1" } } as never);
      expect(result.data).toContain("Đã tạo công việc: Học tiếng Anh");
      expect(finish).toHaveBeenCalledWith(turn._id, result.data, "failed", "token");
    } finally {
      warn.mockRestore();
    }
  });
});
