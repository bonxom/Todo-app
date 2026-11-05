import { useEffect, useRef, useState } from "react";
import type {
  ProposalAction,
  ProposalItem,
  ProposalView,
} from "@/shared/types/A2UI/taskProposal";
import { categoryService } from "@/shared/services/categoryService";
import { projectService } from "@/shared/services/projectService";
import type { Category, Project } from "@/shared/types/domain";
import { generateUUID } from "@/shared/utils/id";
import {
  toDateTimeLocalValue,
  toISOStringLocal,
} from "@/shared/utils/dateTime";
import "./taskProposal.css";

type Props = {
  proposal: ProposalView;
  draft: ProposalView;
  onChange: (draft: ProposalView) => void;
  onAction: (action: ProposalAction) => Promise<unknown>;
  onDirtyChange?: (dirty: boolean) => void;
  onOpenTask?: (id: string) => void;
  disabled?: boolean;
};
export function TaskProposalForm({
  proposal,
  draft,
  onChange,
  onAction,
  onDirtyChange,
  onOpenTask,
  disabled,
}: Props) {
  const [choices, setChoices] = useState<{
    categories: Category[];
    projects: Project[];
    loaded: boolean;
  }>({ categories: [], projects: [], loaded: false });
  const [choiceError, setChoiceError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const terminal = proposal.status !== "draft";
  const locked = terminal || disabled || submitting;
  const dirty =
    !terminal &&
    JSON.stringify({
      items: draft.items,
      selected: [...draft.selectedItemIds].sort(),
    }) !==
      JSON.stringify({
        items: proposal.items,
        selected: [...proposal.selectedItemIds].sort(),
      });
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    let active = true;
    if (terminal) return;
    Promise.all([
      categoryService.getAllCategories(),
      projectService.getAllProjects(),
    ])
      .then(([categories, projects]) => {
        if (active) setChoices({ categories, projects, loaded: true });
      })
      .catch(() => {
        if (active)
          setChoiceError(
            "Không thể tải danh mục và dự án. Hãy tải lại đề xuất.",
          );
      });
    return () => {
      active = false;
    };
  }, [terminal]);
  const validation = draft.items.map((item) => {
    if (!item.title.trim() || item.title.length > 200)
      return "Tiêu đề cần từ 1 đến 200 ký tự.";
    if ((item.description?.length ?? 0) > 1000)
      return "Mô tả tối đa 1000 ký tự.";
    if (
      item.startDate &&
      item.dueDate &&
      new Date(item.startDate) > new Date(item.dueDate)
    )
      return "Ngày bắt đầu phải trước hạn hoàn thành.";
    if (
      choices.loaded &&
      item.categoryId &&
      !choices.categories.some((category) => category._id === item.categoryId)
    )
      return "Danh mục không còn khả dụng. Hãy chọn lại.";
    if (
      choices.loaded &&
      item.projectId &&
      !choices.projects.some(
        (project) =>
          project._id === item.projectId && project.status !== "completed",
      )
    )
      return "Dự án không còn nhận công việc. Hãy chọn lại.";
    return "";
  });
  const invalid =
    validation.some(Boolean) ||
    Boolean(choiceError) ||
    (!terminal && !choices.loaded);
  const update = (id: string, changes: Partial<ProposalItem>) => {
    if (!locked)
      onChange({
        ...draft,
        items: draft.items.map((item) =>
          item.id === id ? { ...item, ...changes } : item,
        ),
      });
  };
  const submit = async (action: "save" | "confirm" | "cancel") => {
    if (
      locked ||
      busy.current ||
      (action !== "cancel" && invalid) ||
      (action === "confirm" && !draft.selectedItemIds.length)
    )
      return;
    busy.current = true;
    setSubmitting(true);
    setError("");
    const base = { requestId: generateUUID(), revision: proposal.revision };
    try {
      await onAction(
        action === "cancel"
          ? { ...base, action }
          : {
              ...base,
              action,
              items: draft.items,
              selectedItemIds: draft.selectedItemIds,
            },
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể lưu. Hãy thử lại.",
      );
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };
  return (
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
      {draft.items.map((item, index) => (
        <fieldset
          key={item.id}
          disabled={locked}
          className="task-proposal-item"
        >
          <legend>Công việc {index + 1}</legend>
          <label className="task-proposal-selection">
            <input
              type="checkbox"
              checked={draft.selectedItemIds.includes(item.id)}
              aria-label={`Chọn công việc: ${item.title}`}
              onChange={() =>
                onChange({
                  ...draft,
                  selectedItemIds: draft.selectedItemIds.includes(item.id)
                    ? draft.selectedItemIds.filter((id) => id !== item.id)
                    : [...draft.selectedItemIds, item.id],
                })
              }
            />
            Chọn để tạo
          </label>
          <label>
            Tiêu đề
            <input
              aria-label={`Task ${index + 1} title`}
              value={item.title}
              maxLength={200}
              onChange={(e) => update(item.id, { title: e.target.value })}
            />
          </label>
          <label>
            Mô tả
            <textarea
              aria-label={`Task ${index + 1} description`}
              value={item.description ?? ""}
              maxLength={1000}
              rows={2}
              onChange={(e) => update(item.id, { description: e.target.value })}
            />
          </label>
          <div className="task-proposal-fields">
            <label>
              Ưu tiên
              <select
                aria-label={`Task ${index + 1} priority`}
                value={item.priority ?? "Medium"}
                onChange={(e) =>
                  update(item.id, {
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
                  update(item.id, { categoryId: e.target.value || undefined })
                }
              >
                <option value="">Uncategorized</option>
                {item.categoryId &&
                  !choices.categories.some(
                    (c) => c._id === item.categoryId,
                  ) && (
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
                  update(item.id, { projectId: e.target.value || null })
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
                    update(item.id, {
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
      ))}
      {terminal ? (
        <ul>
          {proposal.createdTasks.map((task) => (
            <li key={task.taskId}>
              {onOpenTask ? (
                <button type="button" onClick={() => onOpenTask(task.taskId)}>
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
            disabled={locked}
            onClick={() => void submit("cancel")}
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={locked || invalid}
            onClick={() => void submit("save")}
          >
            Lưu bản nháp
          </button>
          <button
            type="button"
            disabled={locked || invalid || !draft.selectedItemIds.length}
            onClick={() => void submit("confirm")}
          >
            Xác nhận ({draft.selectedItemIds.length})
          </button>
        </footer>
      )}
    </section>
  );
}
