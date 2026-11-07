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
              ? "Đã tạo công việc"
              : proposal.status === "cancelled"
                ? "Đề xuất đã hủy"
                : "Đề xuất công việc (Bản nháp)"}
          </strong>
          <span role="status" className="task-proposal-status">
            {terminal
              ? proposal.status === "created"
                ? `Đã tạo ${proposal.createdTasks.length} công việc`
                : "Đã hủy"
              : dirty
                ? "Chưa lưu thay đổi"
                : "Đã lưu bản nháp"}
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
                  Đã tạo: {task.title}
                </button>
              ) : (
                `Đã tạo: ${task.title}`
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
            Hủy
          </button>
          <button
            type="button"
            className="task-proposal-btn task-proposal-btn-save"
            disabled={locked || invalid}
            onClick={() => void submit("save", onDispatchAction)}
          >
            Lưu bản nháp
          </button>
          <button
            type="button"
            className="task-proposal-btn task-proposal-btn-confirm"
            disabled={locked || invalid || !draft.selectedItemIds.length}
            onClick={() => void submit("confirm", onDispatchAction)}
          >
            Xác nhận ({draft.selectedItemIds.length})
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
