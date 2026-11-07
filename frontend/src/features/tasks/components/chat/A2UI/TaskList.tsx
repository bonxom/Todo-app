import { Fragment, useContext } from "react";
import type { ProposalItem } from "@/shared/types/A2UI/taskProposal";
import {
  toDateTimeLocalValue,
  toISOStringLocal,
} from "@/shared/utils/dateTime";
import { TaskProposalEditorContext } from "./taskProposalEditorContext";
import "./taskProposal.css";

type TaskListProps = {
  bare?: boolean;
};

export function TaskList({ bare = false }: TaskListProps) {
  const editor = useContext(TaskProposalEditorContext);
  if (!editor) {
    throw new Error("Missing task proposal editor context");
  }

  const {
    draft,
    locked,
    terminal,
    choices,
    validation,
    updateItem,
    toggleItemSelection,
  } = editor;

  const content = draft.items.map((item, index) => (
    <fieldset key={item.id} disabled={locked} className="task-proposal-item">
      <legend>Công việc {index + 1}</legend>
      <label className="task-proposal-selection">
        <input
          type="checkbox"
          checked={draft.selectedItemIds.includes(item.id)}
          aria-label={`Chọn công việc: ${item.title}`}
          onChange={() => toggleItemSelection(item.id)}
        />
        Chọn để tạo
      </label>
      <label>
        Tiêu đề
        <input
          aria-label={`Task ${index + 1} title`}
          value={item.title}
          maxLength={200}
          onChange={(e) => updateItem(item.id, { title: e.target.value })}
        />
      </label>
      <label>
        Mô tả
        <textarea
          aria-label={`Task ${index + 1} description`}
          value={item.description ?? ""}
          maxLength={1000}
          rows={2}
          onChange={(e) => updateItem(item.id, { description: e.target.value })}
        />
      </label>
      <div className="task-proposal-fields">
        <label>
          Ưu tiên
          <select
            aria-label={`Task ${index + 1} priority`}
            value={item.priority ?? "Medium"}
            onChange={(e) =>
              updateItem(item.id, {
                priority: e.target.value as ProposalItem["priority"],
              })
            }
          >
            <option value="Low">Thấp</option>
            <option value="Medium">Trung bình</option>
            <option value="High">Cao</option>
          </select>
        </label>
        <label>
          Danh mục
          <select
            aria-label={`Task ${index + 1} category`}
            value={item.categoryId ?? ""}
            onChange={(e) =>
              updateItem(item.id, { categoryId: e.target.value || undefined })
            }
          >
            <option value="">Uncategorized</option>
            {item.categoryId &&
              !choices.categories.some((c) => c._id === item.categoryId) && (
                <option value={item.categoryId}>Danh mục hiện tại</option>
              )}
            {choices.categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dự án
          <select
            aria-label={`Task ${index + 1} project`}
            value={item.projectId ?? ""}
            onChange={(e) =>
              updateItem(item.id, { projectId: e.target.value || null })
            }
          >
            <option value="">Không có dự án</option>
            {item.projectId &&
              !choices.projects.some((p) => p._id === item.projectId) && (
                <option value={item.projectId}>Dự án hiện tại</option>
              )}
            {choices.projects.map((p) => (
              <option
                key={p._id}
                value={p._id}
                disabled={p.status === "completed"}
              >
                {p.name}
                {p.status === "completed" ? " (đã hoàn thành)" : ""}
              </option>
            ))}
          </select>
        </label>
        {(["startDate", "dueDate"] as const).map((field) => (
          <label key={field}>
            {field === "startDate" ? "Bắt đầu" : "Hạn hoàn thành"}
            <input
              type="datetime-local"
              aria-label={`Task ${index + 1} ${field}`}
              value={toDateTimeLocalValue(item[field] ?? "")}
              onChange={(e) =>
                updateItem(item.id, {
                  [field]: e.target.value
                    ? toISOStringLocal(e.target.value)
                    : null,
                })
              }
            />
          </label>
        ))}
      </div>
      {!terminal && validation[index] && (
        <p role="alert">{validation[index]}</p>
      )}
    </fieldset>
  ));

  if (bare) {
    return <Fragment>{content}</Fragment>;
  }

  return <div className="task-proposal">{content}</div>;
}
