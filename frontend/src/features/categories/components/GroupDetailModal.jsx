import { workspaceKey } from "@/features/tasks/utils/workspaceTranslation";
import { useTranslation } from "react-i18next";
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
import { useTransitionTasks } from "@/features/tasks/hooks/useTransitionTasks";

const STATUS_FILTERS = [
  ["all", "All tasks"],
  ["active", "Active"],
  ["completed", "Completed"],
  ["given-up", "Given up"],
];
const rank = { "in-progress": 0, pending: 1, completed: 2, "given-up": 3 };
const PAGE_SIZE = 8;

function TaskConfirmation({ kind, busy, onClose, onConfirm }) {
  const { t } = useTranslation("workspace");

  const ref = useRef(null);
  const id = useId();
  useModalKeyboard(true, ref, () => {
    if (!busy) onClose();
  });
  const deleting = kind === "delete";
  return (
    <div
      className="ui-modal-overlay [background:var(--color-overlay)] fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={busy ? undefined : onClose}
      role="presentation"
    >
      <section
        ref={ref}
        onClick={(event) => event.stopPropagation()}
        className="ui-modal-shell overflow-hidden [border:1px_solid_rgba(31,35,40,0.06)] rounded-[var(--radius-2xl)] [background:var(--color-surface)] [box-shadow:var(--shadow-lg)] w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <div className="ui-modal-header p-[1rem_1.25rem] [border-bottom:1px_solid_var(--color-line)] [background:var(--color-surface)]">
          <h2 id={id} className="text-xl font-semibold">
            {deleting ? t("deleteTask") : t("giveUpTask")}
          </h2>
        </div>
        <div className="ui-modal-body p-[1.25rem]">
          <p className="mb-6 text-sm text-[color:var(--color-text-muted)]">
            {deleting
              ? t("thisTaskWillBePermanentlyDeletedThisActionCannotBeUndone")
              : t("markThisTaskAsGivenUpItWillRemainInYourTaskHistory")}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="ui-btn-secondary flex-1"
              disabled={busy}
              onClick={onClose}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="ui-btn-primary flex-1"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? t("saving") : deleting ? t("delete") : t("giveUp")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function GroupDetailModal({
  name,
  kind,
  tasks = [],
  onClose,
  onTaskUpdated,
  onEdit,
  onDelete,
  projectCompleted = false,
}) {
  const { t } = useTranslation("workspace");

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
  const transitionTasks = useTransitionTasks(shown);
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
      setError(getApiErrorMessage(err, t("unableToUpdateTaskPleaseTryAgain")));
    }
  };
  return createPortal(
    <>
      <div
        className="ui-modal-overlay [background:var(--color-overlay)] group-detail-overlay fixed inset-[0] z-50 flex items-center justify-center p-[24px] [@media(max-width:600px)]:p-[10px]"
        onClick={onClose}
        role="presentation"
      >
        <section
          className="group-detail flex flex-col w-[min(100%,860px)] max-h-[min(90dvh,900px)] overflow-hidden
            [border:1px_solid_var(--color-line)] rounded-[20px] [background:var(--color-surface)]
            [box-shadow:var(--shadow-lg)] [@media(max-width:600px)]:max-h-[94dvh] [@media(max-width:600px)]:rounded-[16px]
            animate-fadeIn"
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="group-detail-header p-[28px_30px_22px] shrink-0 [@media(max-width:600px)]:p-[20px_18px_16px]">
            <div
              className="group-detail-heading flex items-center gap-[14px] [&_>_div]:min-w-[0] [&_>_div]:flex-1
              [&_h2]:[font-weight:650] [&_h2]:[letter-spacing:-0.025em] [&_h2]:m-[4px_0_0] [&_h2]:wrap-anywhere
              [&_h2]:[line-height:1.25]"
            >
              <span className="category-folder w-[42px] h-[42px] grid place-items-center rounded-[12px] [background:var(--color-accent-soft)] text-[var(--color-accent)]">
                <FolderOpen size={23} />
              </span>
              <div>
                <p className="ui-page-kicker m-[0] text-[var(--color-accent)] [font-weight:600] [line-height:1.2] uppercase">
                  {kind}
                  {projectCompleted ? " · Completed" : ""}
                </p>
                <h2 id={titleId}>{name}</h2>
              </div>
              <button
                type="button"
                className="group-icon-button w-[34px] h-[34px] inline-grid place-items-center shrink-0 rounded-[8px] cursor-pointer
                  [&:hover:not(:disabled)]:[background:var(--color-accent-soft)] [&:disabled]:opacity-[0.35]
                  [&:disabled]:cursor-default"
                onClick={onClose}
                aria-label={t("messages.closeV0Details", { v0: kind })}
              >
                <X size={20} />
              </button>
            </div>
            <div
              className="group-detail-summary grid grid-cols-[1fr_1fr_1fr_1.5fr] mt-[22px] p-[18px_20px]
              [background:var(--color-surface-muted)] rounded-[12px] [&_>_div]:flex [&_strong]:[font-weight:600]
              [&_strong]:[font-variant-numeric:tabular-nums] [&_strong]:[line-height:1.25]
              [&_span]:text-[var(--color-text-muted)] [&_.group-detail-progress]:justify-center
              [@media(max-width:600px)]:p-[14px] [@media(max-width:600px)]:grid-cols-[1fr_1fr_1fr]
              [@media(max-width:600px)]:mt-[16px] [@media(max-width:600px)]:[&_.group-detail-progress]:col-[1_/_-1]
              [@media(max-width:600px)]:[&_.group-detail-progress]:items-center"
            >
              <div>
                <strong>{tasks.length}</strong>
                <span> {t("tasks")} </span>
              </div>
              <div>
                <strong>{active}</strong>
                <span>{t("active")}</span>
              </div>
              <div>
                <strong>{completed}</strong>
                <span> {t("completed")} </span>
              </div>
              <div className="group-detail-progress [&_b]:text-[var(--color-accent)] [@media(max-width:600px)]:[&_.category-progress]:flex-1">
                <span>
                  <b>{progress}%</b> {t("complete")}{" "}
                </span>
                <div
                  className="category-progress h-[4px] rounded-[5px] overflow-hidden [&_>_div]:h-full [&_>_div]:[background:var(--color-accent)] [&_>_div]:rounded-[inherit] [&_>_div]:[transition:width_0.2s]"
                  role="progressbar"
                  aria-label={t("messages.v0Progress", { v0: name })}
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </header>
          <div className="group-detail-toolbar [border-top:1px_solid_var(--color-line)] [border-bottom:1px_solid_var(--color-line)] p-[16px_30px_0] shrink-0 [@media(max-width:600px)]:p-[12px_18px_0]">
            <div
              className="category-search flex items-center gap-[9px] [border:1px_solid_var(--color-line)] rounded-[9px] p-[0_12px]
              flex-1 text-[var(--color-text-muted)] [&_input]:w-full [&_input]:min-w-[0] [&_input]:[border:0]
              [&_input]:[background:transparent] [&_input]:[outline:none]
              [&:focus-within]:[outline:2px_solid_var(--ring-focus-outline)] [&:focus-within]:outline-offset-[2px]
              [&_button]:cursor-pointer [@media(max-width:1100px)]:basis-[100%]"
            >
              <Search size={16} />
              <input
                aria-label={t("messages.searchTasksInV0", { v0: name })}
                placeholder={t("findATask")}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  updatePage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  aria-label={t("clearTaskSearch")}
                  onClick={() => {
                    setSearch("");
                    updatePage(1);
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div
              className="group-detail-filters flex mt-[12px] overflow-x-auto [&_button]:whitespace-nowrap [&_button]:flex
              [&_button]:items-center [&_button]:p-[10px_0_13px] [&_button]:[border-bottom:2px_solid_transparent]
              [&_button]:cursor-pointer [&_button[aria-pressed=true]]:[border-bottom-color:var(--color-accent)]
              [&_button_span]:p-[1px_5px] [&_button_span]:rounded-[4px]
              [&_button_span]:[background:var(--color-surface-muted)]"
              aria-label={t("taskStatus")}
            >
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
                  {t(workspaceKey(label), { defaultValue: label })}
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
            <p
              className="group-detail-error text-[var(--color-danger)] [background:var(--color-danger-soft)] p-[12px_30px] text-[13px]"
              role="alert"
            >
              {error}
            </p>
          )}
          <div
            className="group-detail-list min-h-[150px] overflow-y-auto overscroll-contain p-[0_30px] [scrollbar-gutter:stable]
            [&_>_ul_>_li:not(:last-child)]:[border-bottom:1px_solid_var(--color-line)]
            [@media(max-width:600px)]:px-[18px]"
            ref={listRef}
          >
            {transitionTasks.length ? (
              <ul>
                {transitionTasks.map((task) => (
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
              <div
                className="group-detail-empty p-[45px_16px] flex flex-col items-center gap-[12px] text-center
                text-[var(--color-text-muted)] [&_h3]:text-[var(--color-text)] [&_h3]:text-[17px] [&_h3]:[font-weight:600]
                [&_p]:text-[13px] [&_p]:max-w-[40ch]"
              >
                <FolderOpen size={32} />
                <h3>
                  {tasks.length
                    ? t("noMatchingTasks")
                    : t("messages.aFreshStartForV0", { v0: name })}
                </h3>
                <p>
                  {tasks.length
                    ? t("tryAnotherSearchOrStatusFilter")
                    : t(
                        "messages.assignATaskToThisV0FromYourTaskListToGetStarted",
                        { v0: kind },
                      )}
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
                    {t("clearTaskFilters")}
                  </button>
                )}
              </div>
            )}
          </div>
          <footer
            className="group-detail-footer flex items-center gap-[16px] p-[12px_30px] [border-top:1px_solid_var(--color-line)]
            shrink-0 [&_>_p]:text-[var(--color-text-muted)] [&_>_p]:text-[11px]
            [@media(max-width:600px)]:p-[10px_14px] [@media(max-width:600px)]:gap-[8px]"
          >
            <p role="status">
              {filtered.length
                ? t("messages.v0V1OfV2Tasks", {
                    v0: (currentPage - 1) * PAGE_SIZE + 1,
                    v1: Math.min(currentPage * PAGE_SIZE, filtered.length),
                    v2: filtered.length,
                  })
                : "0 tasks"}
            </p>
            <div className="group-detail-pagination flex items-center gap-[8px] ml-auto text-[11px] text-[var(--color-text-muted)]">
              <button
                className="group-icon-button w-[34px] h-[34px] inline-grid place-items-center shrink-0 rounded-[8px] cursor-pointer
                  [&:hover:not(:disabled)]:[background:var(--color-accent-soft)] [&:disabled]:opacity-[0.35]
                  [&:disabled]:cursor-default"
                type="button"
                disabled={currentPage === 1}
                onClick={() => updatePage(currentPage - 1)}
                aria-label={t("previousTaskPage")}
              >
                <ArrowLeft size={16} />
              </button>
              <span>
                {currentPage} / {pages}
              </span>
              <button
                className="group-icon-button w-[34px] h-[34px] inline-grid place-items-center shrink-0 rounded-[8px] cursor-pointer
                  [&:hover:not(:disabled)]:[background:var(--color-accent-soft)] [&:disabled]:opacity-[0.35]
                  [&:disabled]:cursor-default"
                type="button"
                disabled={currentPage === pages}
                onClick={() => updatePage(currentPage + 1)}
                aria-label={t("nextTaskPage")}
              >
                <ArrowRight size={16} />
              </button>
            </div>
            {onEdit && (
              <div className="group-detail-project-actions flex pl-[12px] [border-left:1px_solid_var(--color-line)] [@media(max-width:600px)]:pl-[5px]">
                <button
                  type="button"
                  className="group-icon-button w-[34px] h-[34px] inline-grid place-items-center shrink-0 rounded-[8px] cursor-pointer
                    [&:hover:not(:disabled)]:[background:var(--color-accent-soft)] [&:disabled]:opacity-[0.35]
                    [&:disabled]:cursor-default"
                  onClick={onEdit}
                  aria-label={t("editProject")}
                  title={t("editProject")}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="group-icon-button w-[34px] h-[34px] inline-grid place-items-center shrink-0 rounded-[8px] cursor-pointer
                    [&:hover:not(:disabled)]:[background:var(--color-accent-soft)] [&:disabled]:opacity-[0.35]
                    [&:disabled]:cursor-default"
                  onClick={onDelete}
                  aria-label={t("deleteProject")}
                  title={t("deleteProject")}
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
