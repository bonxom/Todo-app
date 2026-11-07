import { useContext, useMemo, useEffect, useCallback, useRef } from "react";
import { A2uiHost } from "@/shared/A2UI/A2uiHost";
import type {
  ProposalAction,
  ProposalEnvelope,
  ProposalView,
} from "@/shared/types/A2UI/taskProposal";
import { useTaskProposalEditor } from "@/features/tasks/hooks/A2UI/useTaskProposalEditor";
import { taskProposalRegistry } from "./taskProposalCatalog";
import { compositionProposalRegistry } from "./compositionCatalog";
import { TaskProposalContext } from "./taskProposalContext";
import { TaskProposalEditorContext } from "./taskProposalEditorContext";
import { TaskProposalForm } from "./TaskProposalForm";
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
  const proposalDraft = agentSession?.draft?.proposalDrafts?.[proposalId] as
    ProposalView | undefined;
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

  const editor = useTaskProposalEditor({
    proposal: envelope.proposal,
    draft: proposalDraft,
    onChange: onProposalDraftChange,
    onDirtyChange,
    onAction,
    disabled,
    onOpenTask,
  });

  const pendingActionRef = useRef<Promise<unknown> | null>(null);
  const awaitPendingAction = useCallback(async () => {
    if (pendingActionRef.current) {
      await pendingActionRef.current;
    }
  }, []);

  const options = useMemo(
    () => ({
      baseline: envelope.proposal,
      disabled,
      onDirtyChange,
      onOpenTask,
      proposalDraft: editor.draft,
      onProposalDraftChange: editor.setDraft,
      awaitPendingAction,
    }),
    [
      envelope.proposal,
      disabled,
      onDirtyChange,
      onOpenTask,
      editor.draft,
      editor.setDraft,
      awaitPendingAction,
    ],
  );

  const textFallback = (
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

  const isValidProposal = useMemo(
    () => proposalViewSchema.safeParse(envelope.proposal).success,
    [envelope.proposal],
  );

  const legacyFormFallback = isValidProposal ? (
    <TaskProposalForm
      proposal={envelope.proposal}
      draft={editor.draft}
      onChange={editor.setDraft}
      onDirtyChange={onDirtyChange}
      onAction={onAction}
      disabled={disabled}
      onOpenTask={onOpenTask}
    />
  ) : (
    textFallback
  );

  const composedPayload = envelope.surface?.a2ui;
  const activePayload = composedPayload ?? envelope.a2ui;
  if (!activePayload) return textFallback;

  const activeRegistry = composedPayload
    ? compositionProposalRegistry
    : taskProposalRegistry;
  const activeFallback = composedPayload ? legacyFormFallback : textFallback;

  return (
    <TaskProposalEditorContext.Provider value={editor}>
      <TaskProposalContext.Provider value={options}>
        <A2uiHost
          payload={activePayload}
          registry={activeRegistry}
          fallback={activeFallback}
          onAction={(event) => {
            const work = (async () => {
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
            })();
            pendingActionRef.current = work;
            return work;
          }}
        />
      </TaskProposalContext.Provider>
    </TaskProposalEditorContext.Provider>
  );
}
