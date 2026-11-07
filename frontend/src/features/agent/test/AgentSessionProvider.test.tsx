import { attachmentService } from "@/shared/services/attachmentService";
import type { ProposalEnvelope } from "@/shared/types/A2UI/taskProposal";
import type { ConversationMessage, ChatResponse } from "@/shared/types/domain";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { aiService } from "@/shared/services/aiService";
import { useAuthStore } from "@/stores/useAuthStore";
import SmallChat from "@/features/tasks/components/chat/SmallChat";
import ChatField from "@/features/tasks/components/chat/ChatField";
import { AgentSessionProvider } from "../AgentSessionProvider";
import { useAgentSession } from "../agentSessionContext";
import fixture from "@/test/fixtures/a2ui-task-proposal-v09.json";
import composedFixture from "@/test/fixtures/a2ui-composition-v09.json";
import type { UiSurfaceEnvelope } from "@/shared/types/A2UI/uiSurface";
import { categoryService } from "@/shared/services/categoryService";
import { projectService } from "@/shared/services/projectService";

const { send, load, create } = vi.hoisted(() => ({
  send: vi.fn(),
  load: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/shared/services/aiService", () => ({
  aiService: {
    getConversation: load,
    getConversationCapabilities: vi
      .fn()
      .mockResolvedValue({ taskProposals: true }),
    createConversation: create,
    listConversations: vi.fn().mockResolvedValue([]),
    applyProposalAction: vi.fn(),
  },
}));

vi.mock("@/shared/services/attachmentService", () => ({
  attachmentService: {
    upload: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@/features/tasks/api/aiMutations", () => ({
  useAgenticChatMutation: () => ({ mutateAsync: send }),
  useGenerateTasksMutation: () => ({ mutateAsync: vi.fn() }),
}));

const snapshot = (
  messages: ConversationMessage[] = [],
  conversationId = "conv-1",
) => ({
  conversationId,
  messages,
  before: null,
  pending: [],
  mode: "auto" as const,
});

function AgentChatView() {
  const { chat } = useAgentSession();
  return (
    <div data-testid="agent-chat-view">
      <ChatField
        messages={chat.messages}
        onSendMessage={chat.send}
        isTyping={chat.sending}
        disabled={chat.locked}
        chat={chat}
      />
    </div>
  );
}

function AgentSessionHarness({
  initialSurface = "bubble",
}: {
  initialSurface?: "bubble" | "page";
}) {
  const [surface, setSurface] = useState<"bubble" | "page">(initialSurface);

  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AgentSessionProvider>
        <div>
          <button
            type="button"
            onClick={() =>
              setSurface((s) => (s === "bubble" ? "page" : "bubble"))
            }
          >
            Toggle surface
          </button>
          {surface === "bubble" ? (
            <div data-testid="bubble-view">
              <SmallChat
                isOpen={true}
                onClose={() => {}}
                onOpenInAgent={() => setSurface("page")}
              />
            </div>
          ) : (
            <AgentChatView />
          )}
        </div>
      </AgentSessionProvider>
    </QueryClientProvider>
  );
}

describe("AgentSessionProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ sessionRevision: 1 });
    load.mockResolvedValue(snapshot());
    create.mockImplementation(async (id: string) => id || "conv-1");
    vi.spyOn(categoryService, "getAllCategories").mockResolvedValue([
      { _id: fixture.proposal.items[0].categoryId, name: "Work" },
    ]);
    vi.spyOn(projectService, "getAllProjects").mockResolvedValue([]);
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("performs a single initial GET on mount across surfaces", async () => {
    render(<AgentSessionHarness initialSurface="bubble" />);
    await screen.findByRole("textbox", { name: /message/i });
    expect(aiService.getConversation).toHaveBeenCalledTimes(1);
  });

  it("keeps the draft when switching chat surfaces", async () => {
    const user = userEvent.setup();
    render(<AgentSessionHarness initialSurface="bubble" />);
    const textbox = await screen.findByRole("textbox", { name: /message/i });
    await user.type(textbox, "Plan IELTS");
    await user.click(screen.getByRole("button", { name: /open in agent/i }));
    expect(
      await screen.findByRole("textbox", { name: /message/i }),
    ).toHaveValue("Plan IELTS");
    expect(aiService.getConversation).toHaveBeenCalledTimes(1);
  });

  it("keeps files in draft across surface switches", async () => {
    const user = userEvent.setup();
    render(<AgentSessionHarness initialSurface="bubble" />);
    const fileInput = await screen.findByLabelText(/choose files/i);
    const testFile = new File(["test content"], "study.txt", {
      type: "text/plain",
    });
    await user.upload(fileInput, testFile);
    expect(screen.getByText("study.txt")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /open in agent/i }));
    expect(await screen.findByText("study.txt")).toBeVisible();
  });

  it("clears the migrated file draft after sending the first message", async () => {
    load
      .mockResolvedValueOnce(null)
      .mockResolvedValue(snapshot([], "created-conversation"));
    create.mockResolvedValue("created-conversation");
    vi.mocked(attachmentService.upload).mockResolvedValue({
      id: "file-1",
      name: "notes.txt",
      size: 5,
      mimeType: "text/plain",
    });
    send.mockResolvedValue({
      success: true,
      message: "Chat response",
      status: "completed",
      data: "Accepted",
    });
    const user = userEvent.setup();
    render(<AgentSessionHarness />);
    const input = await screen.findByRole("textbox", { name: "Message" });
    await waitFor(() => expect(input).toBeEnabled());
    await user.upload(
      screen.getByLabelText("Choose files"),
      new File(["notes"], "notes.txt", { type: "text/plain" }),
    );
    await user.type(input, "Read my notes");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(input).toHaveValue(""));
    expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("keeps proposal draft across surface switches", async () => {
    load.mockResolvedValue(
      snapshot([
        {
          id: "m1",
          sender: "bot",
          text: fixture.text,
          timestamp: new Date().toISOString(),
          proposal: fixture.proposal as ProposalEnvelope["proposal"],
          a2ui: fixture.a2ui as ProposalEnvelope["a2ui"],
        },
      ]),
    );

    const user = userEvent.setup();
    render(<AgentSessionHarness initialSurface="bubble" />);
    const titleInput = await screen.findByRole("textbox", {
      name: "Task 1 title",
    });
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Study IELTS");

    await user.click(screen.getByRole("button", { name: /open in agent/i }));
    expect(
      await screen.findByRole("textbox", { name: "Task 1 title" }),
    ).toHaveValue("Updated Study IELTS");
  });

  it("preserves an uncertain proposal action request ID across chat surfaces", async () => {
    load.mockResolvedValue(
      snapshot([
        {
          id: "proposal-message",
          sender: "bot",
          text: fixture.text,
          timestamp: new Date().toISOString(),
          proposal: fixture.proposal as ProposalEnvelope["proposal"],
          a2ui: fixture.a2ui as ProposalEnvelope["a2ui"],
        },
      ]),
    );
    vi.mocked(aiService.applyProposalAction).mockRejectedValue(
      new Error("Network timeout"),
    );
    const user = userEvent.setup();
    render(<AgentSessionHarness />);
    const confirm = await screen.findByRole("button", { name: /Confirm/ });
    await waitFor(() => expect(confirm).toBeEnabled());
    await user.click(confirm);
    await screen.findByRole("button", { name: "Retry request" });
    const first = vi.mocked(aiService.applyProposalAction).mock.calls[0][2];
    await user.click(screen.getByRole("button", { name: /Open in Agent/i }));
    await user.click(
      await screen.findByRole("button", { name: "Retry request" }),
    );
    expect(vi.mocked(aiService.applyProposalAction).mock.calls[1][2]).toEqual(
      first,
    );
  });

  it("guards against discarding unsaved draft on new conversation", async () => {
    const user = userEvent.setup();
    render(<AgentSessionHarness initialSurface="bubble" />);
    const textbox = await screen.findByRole("textbox", { name: /message/i });
    await user.type(textbox, "Unsaved draft message");

    await user.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.getByRole("alertdialog")).toBeVisible();

    // Cancel discard keeps draft
    await user.click(screen.getByRole("button", { name: /keep editing/i }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /message/i })).toHaveValue(
      "Unsaved draft message",
    );

    // Confirm discard clears draft
    await user.click(screen.getByRole("button", { name: "New chat" }));
    await user.click(
      screen.getByRole("button", { name: /discard changes and continue/i }),
    );
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /message/i })).toHaveValue("");
    });
  });

  it("resets session and ignores late response on account switch", async () => {
    let finish: (val: ChatResponse) => void;
    send.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<AgentSessionHarness initialSurface="bubble" />);
    const textbox = await screen.findByRole("textbox", { name: /message/i });
    await user.type(textbox, "Secret of user A{Enter}");

    expect(send).toHaveBeenCalledTimes(1);

    // Switch account (sessionRevision changes)
    load.mockResolvedValue(snapshot([], "conv-user-b"));
    await act(async () => {
      useAuthStore.setState((s) => ({
        sessionRevision: s.sessionRevision + 1,
      }));
    });

    // Late response comes back from user A's request
    await act(async () => {
      finish?.({
        success: true,
        message: "Chat response",
        data: "User A response",
      });
    });

    expect(screen.queryByText("Secret of user A")).not.toBeInTheDocument();
    expect(screen.queryByText("User A response")).not.toBeInTheDocument();
  });

  it("retries pending request with existing requestId", async () => {
    load.mockResolvedValue({
      conversationId: "conv-1",
      messages: [],
      before: null,
      mode: "auto" as const,
      pending: [
        {
          requestId: "req-pending-123",
          userInput: "Pending task",
          conversationId: "conv-1",
          mode: "auto" as const,
        },
      ],
    });

    render(<AgentSessionHarness initialSurface="bubble" />);
    await screen.findByText(/your request is processing/i);
    // Reload will trigger check result / reload
    expect(aiService.getConversation).toHaveBeenCalledWith(undefined);
  });

  it("renders read-only surfaces and preserves composed proposal drafts across SmallChat and Agent page", async () => {
    const readonlySurface = structuredClone(
      composedFixture.readonly,
    ) as UiSurfaceEnvelope;
    const composedProposalSurface = structuredClone(
      composedFixture.proposal,
    ) as UiSurfaceEnvelope;

    load.mockResolvedValue(
      snapshot([
        {
          id: "m-readonly",
          sender: "bot",
          text: readonlySurface.text,
          timestamp: new Date().toISOString(),
          surface: readonlySurface,
        } as ConversationMessage,
        {
          id: "m-composed-proposal",
          sender: "bot",
          text: composedProposalSurface.text,
          timestamp: new Date().toISOString(),
          proposal: fixture.proposal as ProposalEnvelope["proposal"],
          a2ui: fixture.a2ui as ProposalEnvelope["a2ui"],
          surface: composedProposalSurface,
        } as ConversationMessage,
      ]),
    );

    const user = userEvent.setup();
    render(<AgentSessionHarness initialSurface="bubble" />);

    expect(
      await screen.findByRole("heading", { name: "Weekly Study Plan" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Review and confirm the proposed study tasks below.",
      ),
    ).toBeInTheDocument();

    const titleInput = await screen.findByRole("textbox", {
      name: "Task 1 title",
    });
    await user.clear(titleInput);
    await user.type(titleInput, "Composed draft across views");

    await user.click(screen.getByRole("button", { name: /open in agent/i }));

    expect(
      await screen.findByRole("heading", { name: "Weekly Study Plan" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("textbox", { name: "Task 1 title" }),
    ).toHaveValue("Composed draft across views");
  });
});
