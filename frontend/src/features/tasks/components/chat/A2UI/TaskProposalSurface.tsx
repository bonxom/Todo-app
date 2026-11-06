import { useContext, useMemo, useEffect, useCallback } from "react";
import { A2uiHost } from "@/shared/A2UI/A2uiHost";
import type {
  ProposalAction,
  ProposalEnvelope,
} from "@/shared/types/A2UI/taskProposal";
import { taskProposalRegistry } from "./taskProposalCatalog";
import { TaskProposalContext } from "./taskProposalContext";
import { proposalViewSchema } from "./taskProposalSchema";
import { AgentSessionContext } from "@/features/agent/agentSessionContext";

export interface TaskProposalSurfaceProps {
  envelope: ProposalEnvelope;
  onAction?: (action: ProposalAction) => Promise<unknown>;
  onDirtyChange?: (dirty: boolean) => void;
  onReload?: () => void;
  disabled?: boolean;
  onOpenTask?: (id: string) => void;
}
export function TaskProposalSurface({
  envelope,
  onAction,
  onDirtyChange,
  onReload,
  disabled,
  onOpenTask,
}: TaskProposalSurfaceProps) {
  const agentSession = useContext(AgentSessionContext);
  const proposalId = envelope.proposal.id;
  const proposalDraft = agentSession?.draft?.proposalDrafts?.[proposalId];
  const setProposalDraft = agentSession?.setProposalDraft;
  const onProposalDraftChange = useCallback(
    (draft: unknown) => {
      setProposalDraft?.(proposalId, draft);
    },
    [setProposalDraft, proposalId],
  );
  useEffect(() => {
    if (
      proposalDraft &&
      (envelope.proposal.status !== "draft" ||
        (proposalDraft as { revision?: number }).revision !==
          envelope.proposal.revision)
    ) {
      setProposalDraft?.(proposalId, null);
    }
  }, [proposalDraft, envelope.proposal, proposalId, setProposalDraft]);

  const options = useMemo(
    () => ({
      baseline: envelope.proposal,
      disabled,
      onDirtyChange,
      onOpenTask,
      proposalDraft,
      onProposalDraftChange,
    }),
    [
      envelope.proposal,
      disabled,
      onDirtyChange,
      onOpenTask,
      proposalDraft,
      onProposalDraftChange,
    ],
  );
  const fallback = (
    <section aria-label="Đề xuất công việc" className="p-3 space-y-2">
      <p role="status">Không thể hiển thị giao diện tương tác.</p>
      <p className="whitespace-pre-wrap">{envelope.text}</p>
      {onReload && (
        <button type="button" onClick={onReload}>
          Tải lại
        </button>
      )}
    </section>
  );
  if (!envelope.a2ui) return fallback;
  return (
    <TaskProposalContext.Provider value={options}>
      <A2uiHost
        payload={envelope.a2ui}
        registry={taskProposalRegistry}
        fallback={fallback}
        onAction={async (event) => {
          if (!onAction || disabled)
            throw new Error("Thao tác hiện không khả dụng.");
          const proposal = proposalViewSchema.parse(event.context.proposal);
          if (
            proposal.id !== envelope.proposal.id ||
            proposal.conversationId !== envelope.proposal.conversationId ||
            proposal.revision !== envelope.proposal.revision
          )
            throw new Error("Đề xuất đã thay đổi. Vui lòng tải lại.");
          const requestId = String(event.context.requestId);
          if (event.name === "cancel")
            await onAction({
              action: "cancel",
              revision: proposal.revision,
              requestId,
            });
          else if (event.name === "save" || event.name === "confirm")
            await onAction({
              action: event.name,
              revision: proposal.revision,
              requestId,
              items: proposal.items,
              selectedItemIds: proposal.selectedItemIds,
            });
          else throw new Error("Unknown action");
        }}
      />
    </TaskProposalContext.Provider>
  );
}
