import { useTranslation } from "react-i18next";
import { Fragment, useContext } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Save,
  X,
} from "lucide-react";
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

  const statusPillClass =
    proposal.status === "created"
      ? "bg-[var(--color-success-soft,#eaf4ef)] text-[var(--v2-success,var(--color-success,#2f7d5a))]"
      : proposal.status === "cancelled"
        ? "bg-[var(--v2-input-fill,var(--color-surface-muted,#f1f3f5))] text-[var(--v2-muted,var(--color-text-muted,#667085))]"
        : dirty
          ? "bg-[var(--color-warning-soft,#faf0df)] text-[var(--v2-warning,var(--color-warning,#a46a2a))]"
          : "bg-[color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_13%,transparent)] text-[var(--v2-accent,var(--color-accent,#456b8c))]";

  const content = (
    <Fragment>
      {showHeader && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--v2-border,var(--color-line,#d9dee5))] pb-2">
          <strong className="text-[0.875rem] font-semibold tracking-[-0.012em] text-[var(--v2-ink,var(--color-text,#1f2328))]">
            {proposal.status === "created"
              ? t("tasksCreated")
              : proposal.status === "cancelled"
                ? t("proposalCancelled")
                : t("taskProposalDraft")}
          </strong>
          <span
            role="status"
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.71rem] font-semibold ${statusPillClass}`}
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
          className="m-0 flex items-start gap-1.5 rounded-[10px] bg-[var(--color-danger-soft,#f9ecea)] px-2.5 py-2 text-[0.77rem] font-medium text-[var(--color-danger,#b25547)]"
        >
          <AlertCircle
            size={14}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <span>{error || choiceError}</span>
        </p>
      )}

      {terminal ? (
        proposal.createdTasks.length > 0 && (
          <div className="min-w-0 overflow-hidden rounded-[12px] border border-[color-mix(in_srgb,var(--v2-success,var(--color-success,#2f7d5a))_26%,var(--v2-border,var(--color-line,#d9dee5)))] bg-[var(--v2-surface-solid,var(--color-surface,#ffffff))]">
            <ul className="m-0 max-h-[220px] list-none divide-y divide-[var(--v2-border,var(--color-line,#d9dee5))] overflow-y-auto p-0">
              {proposal.createdTasks.map((task) => (
                <li key={task.taskId}>
                  {onOpenTask ? (
                    <button
                      type="button"
                      aria-label={t("createdTask", { title: task.title })}
                      onClick={() => onOpenTask(task.taskId)}
                      className="flex min-h-[40px] w-full cursor-pointer items-center justify-between gap-2 border-0 bg-transparent px-3 py-2 text-left text-[0.82rem] font-medium text-[var(--v2-ink,var(--color-text,#1f2328))] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--v2-success,var(--color-success,#2f7d5a))_10%,transparent)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CheckCircle2
                          size={14}
                          className="shrink-0 text-[var(--v2-success,var(--color-success,#2f7d5a))]"
                          aria-hidden="true"
                        />
                        <span className="truncate">{task.title}</span>
                      </span>
                      <ArrowUpRight
                        size={14}
                        className="shrink-0 text-[var(--v2-muted,var(--color-text-muted,#667085))]"
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <div className="flex min-h-[38px] items-center gap-2 px-3 py-2 text-[0.82rem] font-medium text-[var(--v2-ink,var(--color-text,#1f2328))]">
                      <CheckCircle2
                        size={14}
                        className="shrink-0 text-[var(--v2-success,var(--color-success,#2f7d5a))]"
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {t("createdTask", { title: task.title })}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      ) : (
        <footer className="flex flex-wrap items-center justify-end gap-2 pt-1.5">
          <button
            type="button"
            disabled={locked}
            onClick={() => void submit("cancel", onDispatchAction)}
            className="mr-auto inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-transparent bg-transparent px-3 py-1.5 text-[0.78rem] font-medium !text-[var(--v2-muted,var(--color-text-muted,#667085))] transition-colors duration-150 hover:bg-[var(--color-danger-soft,#f9ecea)] hover:!text-[var(--color-danger,#b25547)] disabled:cursor-default disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))]"
          >
            <X size={14} aria-hidden="true" />
            <span>{t("cancel")}</span>
          </button>

          <button
            type="button"
            disabled={locked || invalid}
            onClick={() => void submit("save", onDispatchAction)}
            className="task-proposal-glass-btn relative inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[linear-gradient(145deg,var(--v2-glass-fill,var(--color-surface,#ffffff)),var(--v2-shell-fill,var(--color-surface-muted,#f1f3f5)))] px-3.5 py-1.5 text-[0.78rem] font-semibold !text-[var(--v2-ink,var(--color-text,#1f2328))] shadow-[inset_0_1px_0_var(--v2-glass-border,rgb(255_255_255_/_85%)),inset_0_-1px_0_color-mix(in_srgb,var(--v2-border,var(--color-line,#d9dee5))_70%,transparent),0_4px_12px_-6px_rgb(16_45_55_/_20%),0_1px_2px_rgb(16_45_55_/_6%)] backdrop-blur-[12px] backdrop-saturate-150 transition-[background-color,border-color,box-shadow,transform,opacity] duration-150 hover:border-[color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_38%,var(--v2-border,var(--color-line,#d9dee5)))] hover:shadow-[inset_0_1px_0_var(--v2-glass-border,rgb(255_255_255_/_95%)),0_6px_16px_-8px_var(--v2-accent,var(--color-accent,#456b8c))] active:translate-y-[1px] disabled:cursor-default disabled:opacity-45 disabled:active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))]"
          >
            <Save size={13} aria-hidden="true" />
            <span>{t("saveDraft")}</span>
          </button>

          <button
            type="button"
            disabled={locked || invalid || !draft.selectedItemIds.length}
            onClick={() => void submit("confirm", onDispatchAction)}
            className="task-proposal-glass-btn relative inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--v2-glass-border,rgb(255_255_255_/_50%))_45%,transparent)] bg-[linear-gradient(155deg,color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_86%,#ffffff),var(--v2-accent,var(--color-accent,#456b8c))_55%,color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_88%,#000000))] px-4 py-1.5 text-[0.78rem] font-semibold !text-[var(--v2-accent-ink,var(--color-primary-text,#ffffff))] shadow-[inset_0_1px_0_rgb(255_255_255_/_46%),inset_0_-1px_0_rgb(0_0_0_/_18%),0_8px_20px_-8px_var(--v2-accent,var(--color-accent,#456b8c)),0_2px_5px_-2px_rgb(0_0_0_/_16%)] backdrop-blur-[12px] backdrop-saturate-150 transition-[filter,box-shadow,transform,opacity] duration-150 hover:brightness-[1.06] hover:shadow-[inset_0_1px_0_rgb(255_255_255_/_58%),inset_0_-1px_0_rgb(0_0_0_/_18%),0_10px_24px_-8px_var(--v2-accent,var(--color-accent,#456b8c))] active:translate-y-[1px] disabled:cursor-default disabled:opacity-45 disabled:hover:brightness-100 disabled:active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))]"
          >
            <Check size={14} strokeWidth={2.35} aria-hidden="true" />
            <span>
              {t("confirmCount", { count: draft.selectedItemIds.length })}
            </span>
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
