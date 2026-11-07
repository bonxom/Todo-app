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

  const content = draft.items.map((item, index) => {
    const priority = item.priority ?? "Medium";
    const isSelected = draft.selectedItemIds.includes(item.id);
    const priorityLabel =
      priority === "High"
        ? "Ưu tiên cao"
        : priority === "Low"
          ? "Ưu tiên thấp"
          : "Trung bình";

    return (
      <fieldset
        key={item.id}
        disabled={locked}
        data-priority={priority}
        data-selected={isSelected ? "true" : "false"}
        className="task-proposal-item"
      >
        <div className="task-proposal-item-top">
          <legend className="task-proposal-legend">
            Công việc {index + 1}
          </legend>
          <div className="task-proposal-item-badges">
            <span
              className={`task-proposal-priority task-proposal-priority--${priority.toLowerCase()}`}
            >
              {priorityLabel}
            </span>
            <label className="task-proposal-selection">
              <input
                type="checkbox"
                checked={isSelected}
                aria-label={`Chọn công việc: ${item.title}`}
                onChange={() => toggleItemSelection(item.id)}
              />
              <span>Chọn để tạo</span>
            </label>
          </div>
        </div>
        <label className="task-proposal-field">
          <span>Tiêu đề</span>
          <input
            aria-label={`Task ${index + 1} title`}
            value={item.title}
            maxLength={200}
            onChange={(e) => updateItem(item.id, { title: e.target.value })}
          />
        </label>
        <label className="task-proposal-field">
          <span>Mô tả</span>
          <textarea
            aria-label={`Task ${index + 1} description`}
            value={item.description ?? ""}
            maxLength={1000}
            rows={2}
            onChange={(e) =>
              updateItem(item.id, { description: e.target.value })
            }
          />
        </label>
        <div className="task-proposal-fields">
          <label className="task-proposal-field">
            <span>Ưu tiên</span>
            <select
              aria-label={`Task ${index + 1} priority`}
              value={priority}
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
          <label className="task-proposal-field">
            <span>Danh mục</span>
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
          <label className="task-proposal-field">
            <span>Dự án</span>
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
            <label key={field} className="task-proposal-field">
              <span>
                {field === "startDate" ? "Bắt đầu" : "Hạn hoàn thành"}
              </span>
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
          <p role="alert" className="task-proposal-alert">
            {validation[index]}
          </p>
        )}
      </fieldset>
    );
  });

  if (bare) {
    return <Fragment>{content}</Fragment>;
  }

  return <div className="task-proposal">{content}</div>;
}
