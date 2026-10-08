import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";
import TaskDetailButton from "@/features/tasks/components/TaskDetailButton";
import {
  useDeleteTaskMutation,
  useGiveUpTaskMutation,
} from "@/features/tasks/api/taskMutations";
import { getApiErrorMessage } from "@/shared/services/apiError";
import GroupTaskRow from "./GroupTaskRow";

const STATUS_FILTERS = [
  ["all", "All tasks"],
  ["active", "Active"],
  ["completed", "Completed"],
  ["given-up", "Given up"],
];
const rank = { "in-progress": 0, pending: 1, completed: 2, "given-up": 3 };
const PAGE_SIZE = 8;

function TaskConfirmation({ kind, busy, onClose, onConfirm }) {
  const ref = useRef(null);
  const id = useId();
  useModalKeyboard(true, ref, () => {
    if (!busy) onClose();
  });
  const deleting = kind === "delete";
  return (
    <div
      className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={busy ? undefined : onClose}
      role="presentation"
    >
      <section
        ref={ref}
        onClick={(event) => event.stopPropagation()}
        className="ui-modal-shell w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <div className="ui-modal-header">
          <h2 id={id} className="text-xl font-semibold">
            {deleting ? "Delete Task" : "Give Up Task"}
          </h2>
        </div>
        <div className="ui-modal-body">
          <p className="mb-6 text-sm text-[color:var(--color-text-muted)]">
            {deleting
              ? "This task will be permanently deleted. This action cannot be undone."
              : "Mark this task as given up? It will remain in your task history."}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="ui-btn-secondary flex-1"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ui-btn-primary flex-1"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? "Saving…" : deleting ? "Delete" : "Give Up"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function GroupDetailModal({
  name,
  description,
  kind,
  tasks = [],
  onClose,
  onTaskUpdated,
  onEdit,
  onDelete,
  projectCompleted = false,
}) {
  const titleId = useId();
  const ref = useRef(null);
  const listRef = useRef(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [giveUpId, setGiveUpId] = useState(null);
  const [error, setError] = useState("");
  const remove = useDeleteTaskMutation();
  const giveUp = useGiveUpTaskMutation();
  useModalKeyboard(true, ref, onClose);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selectedTask]);
  const completed = tasks.filter((task) => task.status === "completed").length;
  const active = tasks.filter((task) =>
    ["pending", "in-progress"].includes(task.status),
  ).length;
  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  const filtered = useMemo(
    () =>
      tasks
        .filter((task) => {
          const matchesStatus =
            status === "all" ||
            (status === "active"
              ? ["pending", "in-progress"].includes(task.status)
              : task.status === status);
          return (
            matchesStatus &&
            `${task.title} ${task.description || ""}`
              .toLowerCase()
              .includes(search.trim().toLowerCase())
          );
        })
        .sort((a, b) => (rank[a.status] ?? 4) - (rank[b.status] ?? 4)),
    [tasks, search, status],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const shown = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const updatePage = (next) => {
    setPage(next);
    listRef.current?.scrollTo({ top: 0 });
  };
  const confirm = async (mutation, id, close) => {
    try {
      await mutation.mutateAsync(id);
      close(null);
      setError("");
      onTaskUpdated?.();
    } catch (err) {
      close(null);
      setError(
        getApiErrorMessage(err, "Unable to update task. Please try again."),
      );
    }
  };
  return createPortal(
    <>
      <div
        className="ui-modal-overlay group-detail-overlay"
        onClick={onClose}
        role="presentation"
      >
        <section
          className="group-detail animate-fadeIn"
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="group-detail-header">
            <div className="group-detail-heading">
              <span className="category-folder">
                <FolderOpen size={23} />
              </span>
              <div>
                <p className="ui-page-kicker">
                  {kind}
                  {projectCompleted ? " · Completed" : ""}
                </p>
                <h2 id={titleId}>{name}</h2>
              </div>
              <button
                type="button"
                className="group-icon-button"
                onClick={onClose}
                aria-label={`Close ${kind} details`}
              >
                <X size={20} />
              </button>
            </div>
            <p className="group-detail-description">
              {description ||
                `A place for everything that belongs to this ${kind}.`}
            </p>
            <div className="group-detail-summary">
              <div>
                <strong>{tasks.length}</strong>
                <span>Tasks</span>
              </div>
              <div>
                <strong>{active}</strong>
                <span>Active</span>
              </div>
              <div>
                <strong>{completed}</strong>
                <span>Completed</span>
              </div>
              <div className="group-detail-progress">
                <span>
                  <b>{progress}%</b> complete
                </span>
                <div
                  className="category-progress"
                  role="progressbar"
                  aria-label={`${name} progress`}
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </header>
          <div className="group-detail-toolbar">
            <div className="category-search">
              <Search size={16} />
              <input
                aria-label={`Search tasks in ${name}`}
                placeholder="Find a task…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  updatePage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear task search"
                  onClick={() => {
                    setSearch("");
                    updatePage(1);
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="group-detail-filters" aria-label="Task status">
              {STATUS_FILTERS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={status === id}
                  onClick={() => {
                    setStatus(id);
                    updatePage(1);
                  }}
                >
                  {label}
                  <span>
                    {
                      tasks.filter(
                        (task) =>
                          id === "all" ||
                          (id === "active"
                            ? ["pending", "in-progress"].includes(task.status)
                            : task.status === id),
                      ).length
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="group-detail-error" role="alert">
              {error}
            </p>
          )}
          <div className="group-detail-list" ref={listRef}>
            {shown.length ? (
              <ul>
                {shown.map((task) => (
                  <GroupTaskRow
                    key={task._id || task.id}
                    task={task}
                    onEdit={setSelectedTask}
                    onDelete={setDeleteId}
                    onGiveUp={setGiveUpId}
                    onTaskUpdated={onTaskUpdated}
                  />
                ))}
              </ul>
            ) : (
              <div className="group-detail-empty">
                <FolderOpen size={32} />
                <h3>
                  {tasks.length
                    ? "No matching tasks"
                    : `A fresh start for ${name}`}
                </h3>
                <p>
                  {tasks.length
                    ? "Try another search or status filter."
                    : `Assign a task to this ${kind} from your task list to get started.`}
                </p>
                {tasks.length > 0 && (
                  <button
                    type="button"
                    className="ui-btn-secondary"
                    onClick={() => {
                      setSearch("");
                      setStatus("all");
                      updatePage(1);
                    }}
                  >
                    Clear task filters
                  </button>
                )}
              </div>
            )}
          </div>
          <footer className="group-detail-footer">
            <p role="status">
              {filtered.length
                ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length} tasks`
                : "0 tasks"}
            </p>
            <div className="group-detail-pagination">
              <button
                className="group-icon-button"
                type="button"
                disabled={currentPage === 1}
                onClick={() => updatePage(currentPage - 1)}
                aria-label="Previous task page"
              >
                <ArrowLeft size={16} />
              </button>
              <span>
                {currentPage} / {pages}
              </span>
              <button
                className="group-icon-button"
                type="button"
                disabled={currentPage === pages}
                onClick={() => updatePage(currentPage + 1)}
                aria-label="Next task page"
              >
                <ArrowRight size={16} />
              </button>
            </div>
            {onEdit && (
              <div className="group-detail-project-actions">
                <button
                  type="button"
                  className="group-icon-button"
                  onClick={onEdit}
                  aria-label="Edit project"
                  title="Edit project"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="group-icon-button"
                  onClick={onDelete}
                  aria-label="Delete project"
                  title="Delete project"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </footer>
        </section>
      </div>
      {selectedTask && (
        <TaskDetailButton
          isOpen
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={onTaskUpdated}
          onProjectCreated={onTaskUpdated}
        />
      )}
      {deleteId && (
        <TaskConfirmation
          kind="delete"
          busy={remove.isPending}
          onClose={() => setDeleteId(null)}
          onConfirm={() => confirm(remove, deleteId, setDeleteId)}
        />
      )}
      {giveUpId && (
        <TaskConfirmation
          kind="give-up"
          busy={giveUp.isPending}
          onClose={() => setGiveUpId(null)}
          onConfirm={() => confirm(giveUp, giveUpId, setGiveUpId)}
        />
      )}
    </>,
    document.body,
  );
}
