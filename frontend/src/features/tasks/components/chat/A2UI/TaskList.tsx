import { useTranslation } from "react-i18next";
import { Fragment, useContext } from "react";
import type { ProposalItem } from "@/shared/types/A2UI/taskProposal";
import CustomSelect from "@/shared/components/CustomSelect";
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
  const { t } = useTranslation("agent");

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
        ? t("highPriority")
        : priority === "Low"
          ? t("lowPriority")
          : t("medium");

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
            {t("task")}
            {index + 1}
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
                aria-label={t("selectTask", { title: item.title })}
                onChange={() => toggleItemSelection(item.id)}
              />
              <span>{t("selectToCreate")}</span>
            </label>
          </div>
        </div>
        <label className="task-proposal-field">
          <span>{t("title")}</span>
          <input
            aria-label={t("taskTitle", { index: index + 1 })}
            value={item.title}
            maxLength={200}
            onChange={(e) => updateItem(item.id, { title: e.target.value })}
          />
        </label>
        <label className="task-proposal-field">
          <span>{t("description")}</span>
          <textarea
            aria-label={t("taskDescription", { index: index + 1 })}
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
            <span>{t("priority")}</span>
            <CustomSelect
              disabled={locked}
              aria-label={t("taskPriority", { index: index + 1 })}
              value={priority}
              onChange={(e) =>
                updateItem(item.id, {
                  priority: e.target.value as ProposalItem["priority"],
                })
              }
            >
              <option value="Low">{t("low")}</option>
              <option value="Medium">{t("medium")}</option>
              <option value="High">{t("high")}</option>
            </CustomSelect>
          </label>
          <label className="task-proposal-field">
            <span>{t("category")}</span>
            <CustomSelect
              disabled={locked}
              aria-label={t("taskCategory", { index: index + 1 })}
              value={item.categoryId ?? ""}
              onChange={(e) =>
                updateItem(item.id, { categoryId: e.target.value || undefined })
              }
            >
              <option value="">{t("uncategorized")}</option>
              {item.categoryId &&
                !choices.categories.some((c) => c._id === item.categoryId) && (
                  <option value={item.categoryId}>
                    {t("currentCategory")}
                  </option>
                )}
              {choices.categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </CustomSelect>
          </label>
          <label className="task-proposal-field">
            <span>{t("project")}</span>
            <CustomSelect
              disabled={locked}
              aria-label={t("taskProject", { index: index + 1 })}
              value={item.projectId ?? ""}
              onChange={(e) =>
                updateItem(item.id, { projectId: e.target.value || null })
              }
            >
              <option value="">{t("noProject")}</option>
              {item.projectId &&
                !choices.projects.some((p) => p._id === item.projectId) && (
                  <option value={item.projectId}>{t("currentProject")}</option>
                )}
              {choices.projects.map((p) => (
                <option
                  key={p._id}
                  value={p._id}
                  disabled={p.status === "completed"}
                >
                  {p.name}
                  {p.status === "completed" ? t("taskCompletedSuffix") : ""}
                </option>
              ))}
            </CustomSelect>
          </label>
          {(["startDate", "dueDate"] as const).map((field) => (
            <label key={field} className="task-proposal-field">
              <span>{field === "startDate" ? t("start") : t("dueDate")}</span>
              <input
                type="datetime-local"
                aria-label={t(
                  field === "startDate" ? "taskStartDate" : "taskDueDate",
                  { index: index + 1 },
                )}
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
