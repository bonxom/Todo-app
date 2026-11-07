import { useTranslation } from "react-i18next";
import { Fragment, useContext } from "react";
import type { ProposalAction } from "@/shared/types/A2UI/taskProposal";
import { TaskProposalEditorContext } from "./taskProposalEditorContext";
import "./taskProposal.css";

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
          className={`task-proposal-header task-proposal-header--${proposal.status}`}
        >
          <strong>
            {proposal.status === "created"
              ? t("tasksCreated")
              : proposal.status === "cancelled"
                ? t("proposalCancelled")
                : t("taskProposalDraft")}
          </strong>
          <span role="status" className="task-proposal-status">
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
        <p role="alert" className="task-proposal-alert">
          {error || choiceError}
        </p>
      )}
      {terminal ? (
        <ul className="task-proposal-created-list">
          {proposal.createdTasks.map((task) => (
            <li key={task.taskId}>
              {onOpenTask ? (
                <button
                  type="button"
                  className="task-proposal-created-link"
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
        <footer className="task-proposal-actions">
          <button
            type="button"
            className="task-proposal-btn task-proposal-btn-cancel"
            disabled={locked}
            onClick={() => void submit("cancel", onDispatchAction)}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="task-proposal-btn task-proposal-btn-save"
            disabled={locked || invalid}
            onClick={() => void submit("save", onDispatchAction)}
          >
            {t("saveDraft")}
          </button>
          <button
            type="button"
            className="task-proposal-btn task-proposal-btn-confirm"
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
