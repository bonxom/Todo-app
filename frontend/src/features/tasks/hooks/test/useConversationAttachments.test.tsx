import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  mutate: vi.fn(),
  load: vi.fn(),
  pending: vi.fn(),
  messages: vi.fn(),
  busy: { current: false },
}));
vi.mock("@/shared/services/attachmentService", () => ({
  attachmentService: { upload: mocks.upload },
}));
vi.mock("../../api/aiMutations", () => ({
  useAgenticChatMutation: () => ({ mutateAsync: mocks.mutate }),
}));
vi.mock("../useConversationSession", () => ({
  useConversationSession: () => ({
    messages: [],
    setMessages: mocks.messages,
    conversationId: "conversation",
    setConversationId: vi.fn(),
    mode: "auto",
    setMode: vi.fn(),
    before: null,
    loading: false,
    sending: false,
    setSending: vi.fn(),
    error: null,
    setError: vi.fn(),
    pending: null,
    setPending: mocks.pending,
    busy: mocks.busy,
    isCurrent: () => true,
    receive: vi.fn(),
    load: mocks.load,
    reload: vi.fn(),
    loadEarlier: vi.fn(),
    newConversation: vi.fn(),
    openConversation: vi.fn(),
  }),
}));
import { useConversationChat } from "../useConversationChat";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.busy.current = false;
  mocks.mutate.mockResolvedValue({ status: "completed", data: "Saved" });
});
it("reuses successful uploads after partial failure and submits safe IDs", async () => {
  const first = new File(["one"], "one.txt");
  const second = new File(["two"], "two.txt");
  mocks.upload
    .mockResolvedValueOnce({ id: "first", name: "one.txt" })
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValueOnce({ id: "second", name: "two.txt" });
  const { result } = renderHook(() => useConversationChat());
  await act(async () => {
    expect(
      await result.current.send("Keep files", undefined, [first, second]),
    ).toBe(false);
  });
  expect(result.current.uploadError).toBe("Offline");
  expect(mocks.mutate).not.toHaveBeenCalled();
  await act(async () => {
    expect(
      await result.current.send("Keep files", undefined, [first, second]),
    ).toBe(true);
  });
  expect(mocks.upload).toHaveBeenCalledTimes(3);
  expect(mocks.mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      attachmentIds: ["first", "second"],
      userInput: "Keep files",
    }),
  );
  expect(result.current.uploadError).toBeNull();
});
