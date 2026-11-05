import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTaskProposal } from "../A2UI/useTaskProposal";
import { aiService } from "@/shared/services/aiService";
import { ApiError } from "@/shared/services/apiError";
import type {
  ProposalEnvelope,
  ProposalAction,
} from "@/shared/types/A2UI/taskProposal";
import { useAuthStore } from "@/stores/useAuthStore";

const envelope: ProposalEnvelope = {
  text: "Draft",
  proposal: {
    id: "proposal",
    conversationId: "conversation",
    turnId: "turn",
    revision: 1,
    status: "draft",
    protocolVersion: "v0.9",
    catalogId: "urn:orbit:a2ui:task-proposals:v1",
    items: [{ id: "item", title: "Read" }],
    selectedItemIds: ["item"],
    createdTasks: [],
  },
};
const action: ProposalAction = {
  requestId: "request",
  revision: 1,
  action: "confirm",
  items: envelope.proposal.items,
  selectedItemIds: ["item"],
};
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    ...renderHook(
      () =>
        useTaskProposal({
          conversationId: "conversation",
          initialEnvelope: envelope,
        }),
      { wrapper },
    ),
    invalidate,
  };
}
beforeEach(() => vi.restoreAllMocks());
describe("proposal action lifecycle", () => {
  it("retries the identical frozen payload after an uncertain response", async () => {
    const api = vi
      .spyOn(aiService, "applyProposalAction")
      .mockRejectedValueOnce(new ApiError("Timeout", undefined, "timeout"));
    const { result, invalidate } = setup();
    await act(async () => {
      await result.current.submit(action).catch(() => {});
    });
    expect(result.current.pendingAction).toEqual(action);
    api.mockResolvedValueOnce({
      ...envelope,
      proposal: { ...envelope.proposal, revision: 2, status: "created" },
    });
    await act(async () => {
      await result.current.submit({
        ...action,
        requestId: "new-request",
        items: [{ id: "item", title: "Changed" }],
      });
    });
    expect(api.mock.calls[1][2]).toEqual(action);
    expect(result.current.envelope.proposal.status).toBe("created");
    expect(invalidate).toHaveBeenCalled();
  });
  it("clears deterministic ApiError failures and reloads authoritative state", async () => {
    vi.spyOn(aiService, "applyProposalAction").mockRejectedValue(
      new ApiError("Conflict", 409),
    );
    const { result } = setup();
    await act(async () => {
      await result.current.submit(action).catch(() => {});
    });
    expect(result.current.pendingAction).toBeNull();
    const get = vi.spyOn(aiService, "getConversation").mockResolvedValue({
      title: "Test",
      conversationId: "conversation",
      messages: [
        {
          id: "bot",
          sender: "bot",
          text: "Cancelled",
          timestamp: "",
          proposal: {
            ...envelope.proposal,
            revision: 3,
            status: "cancelled",
          },
        },
      ],
      pending: [],
      before: null,
      mode: "auto",
    });
    await act(async () => {
      await result.current.reload();
    });
    expect(get).toHaveBeenCalledWith("conversation", undefined);
    expect(result.current.envelope.proposal.status).toBe("cancelled");
  });
  it("ignores a response after authentication changes", async () => {
    let finish!: (value: ProposalEnvelope) => void;
    vi.spyOn(aiService, "applyProposalAction").mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = setup();
    let pending!: Promise<ProposalEnvelope>;
    act(() => {
      pending = result.current.submit(action);
    });
    useAuthStore.setState((state) => ({
      sessionRevision: state.sessionRevision + 1,
    }));
    await act(async () => {
      finish({
        ...envelope,
        proposal: { ...envelope.proposal, status: "created" },
      });
      await pending;
    });
    await waitFor(() =>
      expect(result.current.envelope.proposal.status).toBe("draft"),
    );
  });
});
