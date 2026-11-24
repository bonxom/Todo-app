import { useTranslation } from "react-i18next";
import { AgentSessionContext } from "@/features/agent/agentSessionContext";
import { useCallback, useContext, useEffect, useState } from "react";
import { AlertCircle, RefreshCw, RotateCcw } from "lucide-react";
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
  const { status, createdTasks, items } = proposal.envelope.proposal;
  const count = createdTasks.length;
  const outcome =
    status === "cancelled"
      ? t("proposalCancelFeedback")
      : status === "created" && count > 0
        ? count < items.length
          ? t("proposalPartialConfirmFeedback", { count, total: items.length })
          : t("proposalConfirmFeedback", { count })
        : "";
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

  const hasRetryOrReload =
    (proposal.pendingAction && !proposal.isSubmitting) ||
    proposal.conflict ||
    Boolean(proposal.error);

  return (
    <div className="flex min-w-0 flex-col gap-2">
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

      <div
        role="status"
        className={outcome ? "text-[var(--color-text)]" : "sr-only"}
      >
        {outcome}
      </div>

      {(proposal.error || detailError) && (
        <p
          role="alert"
          className="m-0 flex items-start gap-1.5 rounded-[10px] bg-[var(--color-danger-soft,#f9ecea)] px-2.5 py-2 text-[0.77rem] font-medium text-[var(--color-danger,#b25547)]"
        >
          <AlertCircle
            size={14}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <span>{proposal.error || detailError}</span>
        </p>
      )}

      {hasRetryOrReload && (
        <div className="flex flex-wrap items-center gap-2">
          {proposal.pendingAction && !proposal.isSubmitting && (
            <button
              type="button"
              onClick={() =>
                void proposal
                  .submit(proposal.pendingAction!)
                  .catch(() => undefined)
              }
              className="task-proposal-glass-btn relative inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--v2-glass-border,rgb(255_255_255_/_50%))_45%,transparent)] bg-[linear-gradient(155deg,color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_86%,#ffffff),var(--v2-accent,var(--color-accent,#456b8c))_58%,color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_88%,#000000))] px-3.5 py-1.5 text-[0.76rem] font-semibold !text-[var(--v2-accent-ink,var(--color-primary-text,#ffffff))] shadow-[inset_0_1px_0_rgb(255_255_255_/_46%),0_6px_16px_-8px_var(--v2-accent,var(--color-accent,#456b8c))] backdrop-blur-[12px] transition-[filter,transform,opacity] duration-150 hover:brightness-[1.06] active:translate-y-[1px]"
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>{t("retryRequest")}</span>
            </button>
          )}
          {(proposal.conflict || proposal.error) && (
            <button
              type="button"
              disabled={proposal.isSubmitting}
              onClick={() =>
                proposal.dirty ? setConfirmReload(true) : void runReload()
              }
              className="task-proposal-glass-btn relative inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[linear-gradient(145deg,var(--v2-glass-fill,var(--color-surface,#ffffff)),var(--v2-shell-fill,var(--color-surface-muted,#f1f3f5)))] px-3.5 py-1.5 text-[0.76rem] font-semibold !text-[var(--v2-ink,var(--color-text,#1f2328))] shadow-[inset_0_1px_0_var(--v2-glass-border,rgb(255_255_255_/_85%)),0_3px_10px_-6px_rgb(16_45_55_/_18%)] backdrop-blur-[12px] transition-[box-shadow,transform,opacity] duration-150 hover:shadow-[inset_0_1px_0_var(--v2-glass-border,rgb(255_255_255_/_95%)),0_6px_14px_-8px_var(--v2-accent,var(--color-accent,#456b8c))] active:translate-y-[1px] disabled:cursor-default disabled:opacity-45"
            >
              <RefreshCw size={13} aria-hidden="true" />
              <span>{t("reloadProposal")}</span>
            </button>
          )}
        </div>
      )}

      {confirmReload && (
        <div
          role="alertdialog"
          aria-label={t("discardUnsavedChanges")}
          className="flex flex-col gap-2.5 rounded-[12px] border border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[var(--v2-surface-solid,var(--color-surface,#ffffff))] p-3 shadow-[var(--v2-shadow-sm,var(--shadow-xs))]"
        >
          <p className="m-0 text-[0.8rem] text-[var(--v2-ink,var(--color-text,#1f2328))]">
            {t("reloadingWillDiscardUnsavedChanges")}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmReload(false)}
              className="inline-flex min-h-[34px] cursor-pointer items-center rounded-[9px] border border-[var(--v2-border,var(--color-line,#d9dee5))] bg-transparent px-3 py-1.5 text-[0.76rem] font-medium !text-[var(--v2-ink,var(--color-text,#1f2328))] hover:bg-[var(--v2-input-fill,var(--color-surface-muted,#f1f3f5))]"
            >
              {t("keepEditing")}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmReload(false);
                void runReload();
              }}
              className="inline-flex min-h-[34px] cursor-pointer items-center rounded-[9px] border border-transparent bg-[var(--color-danger,#b25547)] px-3 py-1.5 text-[0.76rem] font-semibold !text-white hover:opacity-90"
            >
              {t("discardChangesAndReload")}
            </button>
          </div>
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
