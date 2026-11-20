import { useTranslation } from "react-i18next";
import { useContext } from "react";
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

  return (
    <TaskProposalEditorContext.Provider value={editor}>
      <section className="task-proposal" aria-label={t("taskProposal")}>
        <header
          className="task-proposal-header flex flex-wrap items-center gap-[0.5rem] justify-between pb-[0.65rem]
          [border-bottom:1px_solid_var(--color-line,#d9dee5)] [&_strong]:text-[0.9rem] [&_strong]:[font-weight:650]
          [&_strong]:[letter-spacing:-0.01em]"
        >
          <strong>
            {proposal.status === "created"
              ? t("tasksCreated")
              : proposal.status === "cancelled"
                ? t("proposalCancelled")
                : t("taskProposalDraft")}
          </strong>
          <span role="status">
            {terminal
              ? proposal.status === "created"
                ? t("createdCount", { count: proposal.createdTasks.length })
                : t("cancelled")
              : dirty
                ? t("unsavedChanges")
                : t("draftSaved")}
          </span>
        </header>
        {(error || choiceError) && <p role="alert">{error || choiceError}</p>}
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
