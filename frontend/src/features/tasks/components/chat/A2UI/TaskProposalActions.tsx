import { useTranslation } from "react-i18next";
import { Fragment, useContext } from "react";
import type { ProposalAction } from "@/shared/types/A2UI/taskProposal";
import { TaskProposalEditorContext } from "./taskProposalEditorContext";

type TaskProposalActionsProps = {
  bare?: boolean;
  showHeader?: boolean;
  showAlerts?: boolean;
  onDispatchAction?: (action: ProposalAction) => Promise<unknown>;
};

export function TaskProposalActions({
  bare = false,
  showHeader = true,
  showAlerts = true,
  onDispatchAction,
}: TaskProposalActionsProps) {
  const { t } = useTranslation("agent");

  const editor = useContext(TaskProposalEditorContext);
  if (!editor) {
    throw new Error("Missing task proposal editor context");
  }

  const {
    proposal,
    draft,
    terminal,
    dirty,
    locked,
    invalid,
    error,
    choiceError,
    onOpenTask,
    submit,
  } = editor;

  const content = (
    <Fragment>
      {showHeader && (
        <header
          className={`task-proposal-header flex flex-wrap items-center gap-[0.5rem] justify-between pb-[0.65rem] [border-bottom:1px_solid_var(--color-line,#d9dee5)] [&_strong]:text-[0.9rem] [&_strong]:[font-weight:650] [&_strong]:[letter-spacing:-0.01em] task-proposal-header--${proposal.status}`}
        >
          <strong>
            {proposal.status === "created"
              ? t("tasksCreated")
              : proposal.status === "cancelled"
                ? t("proposalCancelled")
                : t("taskProposalDraft")}
          </strong>
          <span
            role="status"
            className="task-proposal-status inline-flex items-center p-[0.2rem_0.55rem] rounded-[999px] text-[0.72rem] [font-weight:600]"
          >
            {terminal
              ? proposal.status === "created"
                ? t("createdCount", { count: proposal.createdTasks.length })
                : t("cancelled")
              : dirty
                ? t("unsavedChanges")
                : t("draftSaved")}
          </span>
        </header>
      )}
      {showAlerts && (error || choiceError) && (
        <p
          role="alert"
          className="task-proposal-alert m-[0] p-[0.45rem_0.65rem] rounded-[var(--radius-sm,8px)]
          [background:var(--color-danger-soft,#f9ecea)] text-[var(--color-danger,#b25547)] text-[0.78rem]
          [font-weight:550]"
        >
          {error || choiceError}
        </p>
      )}
      {terminal ? (
        <ul className="task-proposal-created-list m-[0] p-[0] [list-style:none] flex flex-col gap-[0.4rem]">
          {proposal.createdTasks.map((task) => (
            <li key={task.taskId}>
              {onOpenTask ? (
                <button
                  type="button"
                  className="task-proposal-created-link w-full text-left [background:var(--color-success-soft,#eaf4ef)] border-[color-mix(_in_srgb,var(--color-success,#2f7d5a)_30%,var(--color-line,#d9dee5)_)]"
                  onClick={() => onOpenTask(task.taskId)}
                >
                  {t("createdTask", { title: task.title })}
                </button>
              ) : (
                t("createdTask", { title: task.title })
              )}
            </li>
          ))}
        </ul>
      ) : (
        <footer
          className="task-proposal-actions flex flex-wrap items-center justify-end gap-[0.5rem] pt-[0.35rem]
          [&_button:last-child]:border-transparent
          [&_button:last-child]:[box-shadow:var(--shadow-xs,0_1px_2px_rgba(16,24,40,0.06))]"
        >
          <button
            type="button"
            className="task-proposal-btn task-proposal-btn-cancel mr-auto [background:transparent]
              [&:hover:not(:disabled)]:border-[var(--color-danger,#b25547)]
              [&:hover:not(:disabled)]:[background:var(--color-danger-soft,#f9ecea)]"
            disabled={locked}
            onClick={() => void submit("cancel", onDispatchAction)}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="task-proposal-btn task-proposal-btn-save [&:hover:not(:disabled)]:border-[var(--color-accent,#456b8c)] [&:hover:not(:disabled)]:[background:var(--color-surface-muted,#f1f3f5)]"
            disabled={locked || invalid}
            onClick={() => void submit("save", onDispatchAction)}
          >
            {t("saveDraft")}
          </button>
          <button
            type="button"
            className="task-proposal-btn task-proposal-btn-confirm [background:var(--color-accent,#456b8c)] border-transparent
              [box-shadow:var(--shadow-xs,0_1px_2px_rgba(16,24,40,0.06))]
              [&:hover:not(:disabled)]:[background:var(--color-accent-strong,#365772)]"
            disabled={locked || invalid || !draft.selectedItemIds.length}
            onClick={() => void submit("confirm", onDispatchAction)}
          >
            {t("confirmCount", { count: draft.selectedItemIds.length })}
          </button>
        </footer>
      )}
    </Fragment>
  );

  if (bare) {
    return content;
  }

  return <div className="task-proposal">{content}</div>;
}
