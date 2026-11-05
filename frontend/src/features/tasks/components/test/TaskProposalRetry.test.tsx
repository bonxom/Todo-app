import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTaskProposal } from "../../hooks/A2UI/useTaskProposal";
import { aiService } from "@/shared/services/aiService";
import { ApiError } from "@/shared/services/apiError";
import type {
  ProposalAction,
  ProposalEnvelope,
} from "@/shared/types/A2UI/taskProposal";
import fixture from "@/test/fixtures/a2ui-task-proposal-v09.json";
const initial = fixture as ProposalEnvelope;
const action: ProposalAction = {
  action: "confirm",
  requestId: "44444444-4444-4444-8444-444444444444",
  revision: 1,
  items: initial.proposal.items,
  selectedItemIds: initial.proposal.selectedItemIds,
};
function setup() {
  const client = new QueryClient();
  return renderHook(
    () =>
      useTaskProposal({
        conversationId: initial.proposal.conversationId,
        initialEnvelope: initial,
      }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );
}
describe("proposal retry", () => {
  it("reuses the frozen request after an uncertain response and retains success", async () => {
    const success = {
      ...initial,
      proposal: {
        ...initial.proposal,
        status: "created" as const,
        revision: 2,
      },
    };
    const request = vi
      .spyOn(aiService, "applyProposalAction")
      .mockRejectedValueOnce(new ApiError("timeout", undefined, "timeout"))
      .mockResolvedValue(success);
    const { result } = setup();
    await act(async () => {
      await result.current.submit(action).catch(() => {});
    });
    await act(async () => {
      await result.current.submit({
        ...action,
        requestId: "55555555-5555-4555-8555-555555555555",
      });
    });
    expect(request.mock.calls[1][2]).toEqual(action);
    expect(result.current.envelope.proposal.status).toBe("created");
  });
  it("clears pending input for a deterministic ApiError", async () => {
    vi.spyOn(aiService, "applyProposalAction").mockRejectedValue(
      new ApiError("invalid", 422),
    );
    const { result } = setup();
    await act(async () => {
      await result.current.submit(action).catch(() => {});
    });
    expect(result.current.pendingAction).toBeNull();
  });
});
