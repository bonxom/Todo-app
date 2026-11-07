import { useTranslation } from "react-i18next";
import { AgentSessionContext } from "@/features/agent/agentSessionContext";
import { useCallback, useContext, useEffect, useState } from "react";
import { useTaskProposal } from "../../../hooks/A2UI/useTaskProposal";
import type { ProposalEnvelope } from "@/shared/types/A2UI/taskProposal";
import { TaskProposalSurface } from "./TaskProposalSurface";
import { taskService } from "@/shared/services/taskService";
import TaskDetailForm from "../../Form/TaskDetailForm";
import type { Task } from "@/shared/types/domain";

type Props = {
  envelope: ProposalEnvelope;
  onDirtyChange?: (id: string, dirty: boolean) => void;
  disabled?: boolean;
};
export function TaskProposalMessage({
  envelope: initialEnvelope,
  onDirtyChange,
  disabled,
}: Props) {
  const { t } = useTranslation("agent");

  const session = useContext(AgentSessionContext);
  const reloadConversation = session?.chat.reload;
  const setProposalDraft = session?.setProposalDraft;
  const id = initialEnvelope.proposal.id;
  const onSuccess = useCallback(() => {
    setProposalDraft?.(id, null);
    void reloadConversation?.();
  }, [setProposalDraft, id, reloadConversation]);
  const proposal = useTaskProposal({
    onSuccess,
    conversationId: initialEnvelope.proposal.conversationId,
    initialEnvelope,
  });
  const [detail, setDetail] = useState<Task | null>(null);
  const [detailError, setDetailError] = useState("");
  const locked =
    proposal.isSubmitting ||
    Boolean(proposal.pendingAction) ||
    proposal.conflict ||
    disabled;
  const onDirty = proposal.setDirty;
  useEffect(() => {
    onDirtyChange?.(id, proposal.dirty || Boolean(proposal.pendingAction));
  }, [id, proposal.dirty, proposal.pendingAction, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(id, false), [id, onDirtyChange]);
  const [confirmReload, setConfirmReload] = useState(false);
  const runReload = useCallback(async () => {
    setProposalDraft?.(id, null);
    await proposal.reload();
  }, [setProposalDraft, id, proposal]);
  return (
    <div>
      <TaskProposalSurface
        envelope={proposal.envelope}
        onAction={proposal.submit}
        onDirtyChange={onDirty}
        disabled={locked}
        onOpenTask={async (taskId) => {
          try {
            setDetail(await taskService.getTaskById(taskId));
          } catch {
            setDetailError(t("unableToOpenTask"));
          }
        }}
        onReload={() =>
          proposal.dirty ? setConfirmReload(true) : void runReload()
        }
      />
      {(proposal.error || detailError) && (
        <p role="alert">{proposal.error || detailError}</p>
      )}
      {proposal.pendingAction && !proposal.isSubmitting && (
        <button
          type="button"
          onClick={() =>
            void proposal.submit(proposal.pendingAction!).catch(() => undefined)
          }
        >
          {t("retryRequest")}
        </button>
      )}
      {(proposal.conflict || proposal.error) && (
        <button
          type="button"
          disabled={proposal.isSubmitting}
          onClick={() =>
            proposal.dirty ? setConfirmReload(true) : void runReload()
          }
        >
          {t("reloadProposal")}
        </button>
      )}
      {confirmReload && (
        <div role="alertdialog" aria-label={t("discardUnsavedChanges")}>
          <p>{t("reloadingWillDiscardUnsavedChanges")}</p>
          <button onClick={() => setConfirmReload(false)}>
            {t("keepEditing")}
          </button>
          <button
            onClick={() => {
              setConfirmReload(false);
              void runReload();
            }}
          >
            {t("discardChangesAndReload")}
          </button>
        </div>
      )}
      {detail && (
        <TaskDetailForm
          task={detail}
          onClose={() => setDetail(null)}
          onTaskUpdated={() => void runReload()}
          onProjectCreated={() => undefined}
        />
      )}
    </div>
  );
}
