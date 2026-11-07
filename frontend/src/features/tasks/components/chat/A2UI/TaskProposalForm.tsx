import { useContext } from "react";
import {
  useTaskProposalEditor,
  type TaskProposalEditorProps,
} from "@/features/tasks/hooks/A2UI/useTaskProposalEditor";
import { TaskList } from "./TaskList";
import { TaskProposalActions } from "./TaskProposalActions";
import { TaskProposalEditorContext } from "./taskProposalEditorContext";
import "./taskProposal.css";

export type { TaskProposalEditorProps };

export function TaskProposalForm(props: TaskProposalEditorProps) {
  const existingEditor = useContext(TaskProposalEditorContext);
  const localEditor = useTaskProposalEditor(props, !existingEditor);
  const editor = existingEditor ?? localEditor;

  const { proposal, terminal, dirty, error, choiceError } = editor;

  return (
    <TaskProposalEditorContext.Provider value={editor}>
      <section className="task-proposal" aria-label="Đề xuất công việc">
        <header className="task-proposal-header">
          <strong>
            {proposal.status === "created"
              ? "Đã tạo công việc"
              : proposal.status === "cancelled"
                ? "Đề xuất đã hủy"
                : "Đề xuất công việc (Bản nháp)"}
          </strong>
          <span role="status">
            {terminal
              ? proposal.status === "created"
                ? `Đã tạo ${proposal.createdTasks.length} công việc`
                : "Đã hủy"
              : dirty
                ? "Chưa lưu thay đổi"
                : "Đã lưu bản nháp"}
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
