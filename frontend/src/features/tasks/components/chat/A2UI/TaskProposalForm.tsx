import { useTranslation } from "react-i18next";
import { useContext } from "react";
import { AlertCircle } from "lucide-react";
import {
  useTaskProposalEditor,
  type TaskProposalEditorProps,
} from "@/features/tasks/hooks/A2UI/useTaskProposalEditor";
import { TaskList } from "./TaskList";
import { TaskProposalActions } from "./TaskProposalActions";
import { TaskProposalEditorContext } from "./taskProposalEditorContext";

export type { TaskProposalEditorProps };

export function TaskProposalForm(props: TaskProposalEditorProps) {
  const { t } = useTranslation("agent");

  const existingEditor = useContext(TaskProposalEditorContext);
  const localEditor = useTaskProposalEditor(props, !existingEditor);
  const editor = existingEditor ?? localEditor;

  const { proposal, terminal, dirty, error, choiceError } = editor;

  const statusPillClass =
    proposal.status === "created"
      ? "bg-[var(--color-success-soft,#eaf4ef)] text-[var(--v2-success,var(--color-success,#2f7d5a))]"
      : proposal.status === "cancelled"
        ? "bg-[var(--v2-input-fill,var(--color-surface-muted,#f1f3f5))] text-[var(--v2-muted,var(--color-text-muted,#667085))]"
        : dirty
          ? "bg-[var(--color-warning-soft,#faf0df)] text-[var(--v2-warning,var(--color-warning,#a46a2a))]"
          : "bg-[color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_13%,transparent)] text-[var(--v2-accent,var(--color-accent,#456b8c))]";

  return (
    <TaskProposalEditorContext.Provider value={editor}>
      <section className="task-proposal" aria-label={t("taskProposal")}>
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
        {(error || choiceError) && (
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
        <TaskList bare />
        <TaskProposalActions
          bare
          showHeader={false}
          showAlerts={false}
          onDispatchAction={props.onAction}
        />
      </section>
    </TaskProposalEditorContext.Provider>
  );
}
